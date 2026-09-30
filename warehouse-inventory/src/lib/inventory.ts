import { db } from "@/db";
import {
  inventoryTransactions,
  inventoryTransactionItems,
  inventoryAdjustments,
  materialIssuances,
  materialReturns,
  materialSerials,
  stockDeliveries,
  materials,
  technicianAssignments,
} from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import {
  generateTransactionNumber,
  type TransactionType,
} from "./transaction-numbers";

async function getNextSequence(
  type: TransactionType,
  date: Date
): Promise<number> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = {
    RECEIVE: "REC",
    ISSUE: "ISS",
    RETURN: "RET",
    CONSUME: "CON",
    INSTALL: "INS",
    PULLOUT: "PUL",
    TRANSFER: "TRF",
    ADJUST: "ADJ",
    SCRAP: "SCR",
    INSPECT: "INP",
  }[type];
  const result = await db.execute(
    sql`SELECT COUNT(*) as cnt FROM inventory_transactions WHERE transaction_number LIKE ${`${prefix}-${dateStr}-%`}`
  );
  return (
    Number(
      (result as unknown as { cnt: string }[])[0]?.cnt ?? 0
    ) + 1
  );
}

// ─── Receive ──────────────────────────────────────────────────────────────────

export interface ReceiveInput {
  warehouseId: string;
  performedById: string;
  stoNumber: string;
  deliveredAt: Date;
  supplier?: string;
  referenceDocument?: string;
  notes?: string;
  items: {
    materialId: string;
    quantity: number;
    batchNumber?: string;
    serialNumbers?: string[];
  }[];
}

export async function receiveStock(input: ReceiveInput) {
  const now = new Date();
  const seq = await getNextSequence("RECEIVE", now);
  const txNumber = generateTransactionNumber("RECEIVE", seq, now);

  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        transactionNumber: txNumber,
        type: "RECEIVE",
        warehouseId: input.warehouseId,
        referenceDocument: input.referenceDocument,
        notes: input.notes,
        performedById: input.performedById,
        transactedAt: input.deliveredAt,
      })
      .returning();

    await tx.insert(stockDeliveries).values({
      stoNumber: input.stoNumber,
      transactionId: transaction.id,
      warehouseId: input.warehouseId,
      deliveredAt: input.deliveredAt,
      receivedById: input.performedById,
      supplier: input.supplier,
      referenceDocument: input.referenceDocument,
      notes: input.notes,
    });

    for (const item of input.items) {
      await tx.insert(inventoryTransactionItems).values({
        transactionId: transaction.id,
        materialId: item.materialId,
        quantity: String(item.quantity),
        quantityDelta: String(item.quantity),
        fromStatus: null,
        toStatus: "AVAILABLE",
        batchNumber: item.batchNumber,
      });

      if (item.serialNumbers?.length) {
        for (const sn of item.serialNumbers) {
          await tx
            .insert(materialSerials)
            .values({
              materialId: item.materialId,
              serialNumber: sn,
              status: "AVAILABLE",
              warehouseId: input.warehouseId,
              stoNumber: input.stoNumber,
            })
            .onConflictDoNothing();
        }
      }
    }

    return transaction;
  });
}

// ─── Issue ────────────────────────────────────────────────────────────────────

export interface IssueInput {
  technicianId: string;
  warehouseId?: string;
  performedById: string;
  workOrderId?: string;
  purpose?: string;
  notes?: string;
  issuedAt?: Date;
  items: {
    materialId: string;
    quantity: number;
    serialNumber?: string;
    serialId?: string;
    batchNumber?: string;
  }[];
}

export async function issueMaterials(input: IssueInput) {
  const now = input.issuedAt ?? new Date();
  const adjustmentNumber = generateTransactionNumber("ADJUST", await getNextSequence("ADJUST", now), now);
  const issueSeq = await getNextSequence("ISSUE", now);
  const txNumber = generateTransactionNumber("ISSUE", issueSeq, now);

  return db.transaction(async (tx) => {
    const materialIds = [...new Set(input.items.map((item) => item.materialId))];
    const materialRows = await tx
      .select({ id: materials.id, name: materials.name, requiresSerial: materials.requiresSerial })
      .from(materials)
      .where(inArray(materials.id, materialIds))
      .for("update");

    if (materialRows.length !== materialIds.length) {
      throw new Error("One or more selected materials could not be found.");
    }

    const balances = await tx
      .select({
        materialId: inventoryTransactionItems.materialId,
        available: sql<number>`COALESCE(SUM(CASE WHEN ${inventoryTransactionItems.toStatus} IN ('AVAILABLE', 'RETURNED_GOOD') OR ${inventoryTransactionItems.fromStatus} = 'AVAILABLE' THEN ${inventoryTransactionItems.quantityDelta}::numeric ELSE 0 END), 0)`,
        total: sql<number>`COALESCE(SUM(${inventoryTransactionItems.quantityDelta}::numeric), 0)`,
      })
      .from(inventoryTransactionItems)
      .where(inArray(inventoryTransactionItems.materialId, materialIds))
      .groupBy(inventoryTransactionItems.materialId);
    const balanceByMaterial = new Map(
      balances.map((balance) => [balance.materialId, {
        available: Number(balance.available),
        total: Number(balance.total),
      }]),
    );
    const issueTotals = new Map<string, number>();
    const openingTotals = new Map<string, number>();
    const materialById = new Map(materialRows.map((material) => [material.id, material]));
    const submittedSerials = new Set<string>();

    for (const item of input.items) {
      issueTotals.set(item.materialId, (issueTotals.get(item.materialId) ?? 0) + item.quantity);

      const material = materialById.get(item.materialId)!;
      const serialNumber = item.serialNumber?.trim();

      if (material.requiresSerial) {
        if (!serialNumber) throw new Error(`Enter a serial number for ${material.name}.`);
        if (item.quantity !== 1) throw new Error(`${material.name} is serialized; issue one serial number per line.`);
        if (submittedSerials.has(serialNumber)) throw new Error(`Serial number ${serialNumber} is repeated in this issuance.`);
        submittedSerials.add(serialNumber);

        const [existingSerial] = await tx
          .select({ id: materialSerials.id, materialId: materialSerials.materialId, status: materialSerials.status })
          .from(materialSerials)
          .where(eq(materialSerials.serialNumber, serialNumber))
          .limit(1)
          .for("update");

        if (existingSerial) {
          if (existingSerial.materialId !== item.materialId) {
            throw new Error(`Serial number ${serialNumber} belongs to a different material.`);
          }
          if (existingSerial.status !== "AVAILABLE") {
            throw new Error(`Serial number ${serialNumber} is not available for issuance.`);
          }
          item.serialId = existingSerial.id;
          const [serialLedgerEntry] = await tx
            .select({ id: inventoryTransactionItems.id })
            .from(inventoryTransactionItems)
            .where(eq(inventoryTransactionItems.serialId, existingSerial.id))
            .limit(1);
          if (!serialLedgerEntry) {
            openingTotals.set(item.materialId, (openingTotals.get(item.materialId) ?? 0) + 1);
          }
        } else {
          const [newSerial] = await tx
            .insert(materialSerials)
            .values({
              materialId: item.materialId,
              serialNumber,
              status: "AVAILABLE",
              warehouseId: input.warehouseId,
              notes: "Opening stock registered during technician issuance.",
            })
            .returning({ id: materialSerials.id });
          item.serialId = newSerial.id;
          openingTotals.set(item.materialId, (openingTotals.get(item.materialId) ?? 0) + 1);
        }
      } else if (serialNumber) {
        throw new Error(`${material.name} is not configured for serial tracking.`);
      }
    }

    for (const material of materialRows) {
      const currentAvailable = balanceByMaterial.get(material.id)?.available ?? 0;
      const requestedQuantity = issueTotals.get(material.id) ?? 0;

      if (!material.requiresSerial && requestedQuantity > currentAvailable) {
        openingTotals.set(material.id, requestedQuantity - currentAvailable);
      }
      const openingQuantity = openingTotals.get(material.id) ?? 0;
      if (requestedQuantity > currentAvailable + openingQuantity) {
        throw new Error(`Insufficient stock for ${material.name}.`);
      }
    }

    if ([...openingTotals.values()].some((quantity) => quantity > 0)) {
      const [adjustmentTransaction] = await tx
        .insert(inventoryTransactions)
        .values({
          transactionNumber: adjustmentNumber,
          type: "ADJUST",
          warehouseId: input.warehouseId,
          notes: `Opening stock counted during issuance to technician ${input.technicianId}; issue ${txNumber}`,
          performedById: input.performedById,
          transactedAt: now,
        })
        .returning();

      for (const [materialId, openingQuantity] of openingTotals) {
        if (openingQuantity <= 0) continue;
        const quantityBefore = balanceByMaterial.get(materialId)?.available ?? 0;
        const quantityAfter = quantityBefore + openingQuantity;
        const reason = "Opening stock counted from existing warehouse inventory during issuance.";

        await tx.insert(inventoryTransactionItems).values({
          transactionId: adjustmentTransaction.id,
          materialId,
          quantity: String(quantityAfter),
          quantityDelta: String(openingQuantity),
          fromStatus: "AVAILABLE",
          toStatus: "AVAILABLE",
          notes: reason,
        });

        await tx.insert(inventoryAdjustments).values({
          transactionId: adjustmentTransaction.id,
          adjustmentNumber,
          materialId,
          quantityBefore: String(quantityBefore),
          quantityAfter: String(quantityAfter),
          adjustmentReason: reason,
          adjustmentType: "OPENING_STOCK",
          approvedById: input.performedById,
          adjustedById: input.performedById,
          adjustedAt: now,
        });
      }
    }

    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        transactionNumber: txNumber,
        type: "ISSUE",
        warehouseId: input.warehouseId,
        technicianId: input.technicianId,
        workOrderId: input.workOrderId,
        notes: input.notes,
        performedById: input.performedById,
        transactedAt: now,
      })
      .returning();

    for (const item of input.items) {
      const [issueItem] = await tx
        .insert(inventoryTransactionItems)
        .values({
          transactionId: transaction.id,
          materialId: item.materialId,
          serialId: item.serialId,
          quantity: String(item.quantity),
          quantityDelta: String(-item.quantity),
          fromStatus: "AVAILABLE",
          toStatus: "WITH_TECHNICIAN",
          batchNumber: item.batchNumber,
        })
        .returning({ id: inventoryTransactionItems.id });

      const serialRecord = item.serialId
        ? (await tx
            .select({ serialNumber: materialSerials.serialNumber })
            .from(materialSerials)
            .where(eq(materialSerials.id, item.serialId))
            .limit(1))[0]
        : undefined;

      await tx.insert(technicianAssignments).values({
        issueItemId: issueItem.id,
        technicianId: input.technicianId,
        materialId: item.materialId,
        serialId: item.serialId,
        serialNumber: item.serialNumber ?? serialRecord?.serialNumber ?? null,
        warehouseId: input.warehouseId,
        quantity: String(item.quantity),
        issuedAt: now,
        statusUpdatedAt: now,
        updatedById: input.performedById,
      });

      if (item.serialId) {
        await tx
          .update(materialSerials)
          .set({
            status: "WITH_TECHNICIAN",
            currentTechnicianId: input.technicianId,
            updatedAt: now,
          })
          .where(eq(materialSerials.id, item.serialId));
      }
    }

    await tx.insert(materialIssuances).values({
      transactionId: transaction.id,
      issuanceNumber: txNumber,
      technicianId: input.technicianId,
      workOrderId: input.workOrderId,
      warehouseId: input.warehouseId,
      purpose: input.purpose,
      issuedById: input.performedById,
      issuedAt: now,
      notes: input.notes,
    });

    return { ...transaction, openingTransactionNumber: adjustmentNumber };
  });
}

export type TechnicianAssignmentStatus = "INSTALLED" | "CONSUMED" | "RETURNED";

export async function updateTechnicianAssignmentStatus(input: {
  assignmentId: string;
  status: TechnicianAssignmentStatus;
  updatedById: string;
}) {
  const now = new Date();
  const transactionType = input.status === "RETURNED"
    ? "RETURN"
    : input.status === "CONSUMED"
      ? "CONSUME"
      : "INSTALL";
  const sequence = await getNextSequence(transactionType, now);
  const transactionNumber = generateTransactionNumber(transactionType, sequence, now);

  return db.transaction(async (tx) => {
    const [assignment] = await tx
      .select()
      .from(technicianAssignments)
      .where(eq(technicianAssignments.id, input.assignmentId))
      .limit(1)
      .for("update");

    if (!assignment) throw new Error("Assignment not found.");
    if (assignment.status !== "ASSIGNED") throw new Error("Only assigned items can be updated.");

    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        transactionNumber,
        type: transactionType,
        warehouseId: assignment.warehouseId,
        technicianId: assignment.technicianId,
        notes: `Assignment status changed to ${input.status}; assignment ${assignment.id}`,
        performedById: input.updatedById,
        transactedAt: now,
      })
      .returning();

    const toStatus = input.status === "RETURNED" ? "RETURNED_GOOD" : input.status;
    await tx.insert(inventoryTransactionItems).values({
      transactionId: transaction.id,
      materialId: assignment.materialId,
      serialId: assignment.serialId,
      quantity: assignment.quantity,
      quantityDelta: input.status === "RETURNED" ? assignment.quantity : `-${assignment.quantity}`,
      fromStatus: "WITH_TECHNICIAN",
      toStatus,
    });

    if (input.status === "RETURNED") {
      await tx.insert(materialReturns).values({
        transactionId: transaction.id,
        returnNumber: transactionNumber,
        technicianId: assignment.technicianId,
        reason: "UNUSED",
        receivedById: input.updatedById,
        returnedAt: now,
        notes: `Returned from assignment ${assignment.id}`,
      });
    }

    if (assignment.serialId) {
      await tx
        .update(materialSerials)
        .set({
          status: input.status === "RETURNED" ? "AVAILABLE" : input.status,
          currentTechnicianId: null,
          currentWorkOrderId: null,
          warehouseId: input.status === "RETURNED" ? assignment.warehouseId : null,
          updatedAt: now,
        })
        .where(eq(materialSerials.id, assignment.serialId));
    }

    await tx
      .update(technicianAssignments)
      .set({
        status: input.status,
        statusUpdatedAt: now,
        updatedById: input.updatedById,
      })
      .where(eq(technicianAssignments.id, assignment.id));

    return { transactionNumber, technicianId: assignment.technicianId };
  });
}

// ─── Return ───────────────────────────────────────────────────────────────────

export interface ReturnInput {
  technicianId: string;
  warehouseId: string;
  performedById: string;
  workOrderId?: string;
  reason: "UNUSED" | "DEFECTIVE" | "WRONG_ITEM" | "EXCESS" | "JOB_CANCELLED" | "OTHER";
  returnedAt: Date;
  notes?: string;
  items: {
    materialId: string;
    quantity: number;
    serialId?: string;
    condition: "GOOD" | "DEFECTIVE";
    defectReason?: string;
  }[];
}

export async function returnMaterials(input: ReturnInput) {
  const now = input.returnedAt;
  const seq = await getNextSequence("RETURN", now);
  const txNumber = generateTransactionNumber("RETURN", seq, now);

  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        transactionNumber: txNumber,
        type: "RETURN",
        warehouseId: input.warehouseId,
        technicianId: input.technicianId,
        workOrderId: input.workOrderId,
        notes: input.notes,
        performedById: input.performedById,
        transactedAt: now,
      })
      .returning();

    const returnNumber = txNumber;

    await tx.insert(materialReturns).values({
      transactionId: transaction.id,
      returnNumber,
      technicianId: input.technicianId,
      workOrderId: input.workOrderId,
      reason: input.reason,
      receivedById: input.performedById,
      returnedAt: now,
      notes: input.notes,
    });

    for (const item of input.items) {
      const toStatus =
        item.condition === "GOOD" ? "RETURNED_GOOD" : "RETURNED_DEFECTIVE";

      await tx.insert(inventoryTransactionItems).values({
        transactionId: transaction.id,
        materialId: item.materialId,
        serialId: item.serialId,
        quantity: String(item.quantity),
        // Good returns go back to available (+), defective go out (-)
        quantityDelta: item.condition === "GOOD" ? String(item.quantity) : "0",
        fromStatus: "WITH_TECHNICIAN",
        toStatus,
        notes: item.defectReason,
      });

      if (item.serialId) {
        await tx
          .update(materialSerials)
          .set({
            status: toStatus,
            currentTechnicianId: null,
            updatedAt: now,
          })
          .where(eq(materialSerials.id, item.serialId));
      }
    }

    return { transaction, returnNumber };
  });
}

// ─── Install / Consume ────────────────────────────────────────────────────────

export interface ConsumeInstallInput {
  technicianId: string;
  warehouseId: string;
  performedById: string;
  workOrderId?: string;
  consumedAt: Date;
  notes?: string;
  items: {
    materialId: string;
    quantity: number;
    serialId?: string;
    action: "INSTALL" | "CONSUME";
  }[];
}

export async function consumeInstallMaterials(input: ConsumeInstallInput) {
  const now = input.consumedAt;
  const seq = await getNextSequence("INSTALL", now);
  const txNumber = generateTransactionNumber("INSTALL", seq, now);

  return db.transaction(async (tx) => {
    const [transaction] = await tx
      .insert(inventoryTransactions)
      .values({
        transactionNumber: txNumber,
        type: "INSTALL",
        warehouseId: input.warehouseId,
        technicianId: input.technicianId,
        workOrderId: input.workOrderId,
        notes: input.notes,
        performedById: input.performedById,
        transactedAt: now,
      })
      .returning();

    for (const item of input.items) {
      const toStatus = item.action === "INSTALL" ? "INSTALLED" : "CONSUMED";

      await tx.insert(inventoryTransactionItems).values({
        transactionId: transaction.id,
        materialId: item.materialId,
        serialId: item.serialId,
        quantity: String(item.quantity),
        quantityDelta: String(-item.quantity),
        fromStatus: "WITH_TECHNICIAN",
        toStatus,
      });

      if (item.serialId) {
        await tx
          .update(materialSerials)
          .set({
            status: toStatus,
            currentTechnicianId: null,
            currentWorkOrderId: input.workOrderId ?? null,
            updatedAt: now,
          })
          .where(eq(materialSerials.id, item.serialId));
      }
    }

    return transaction;
  });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAvailableQty(materialId: string): Promise<number> {
  const result = await db.execute(
    sql`SELECT COALESCE(SUM(quantity_delta::numeric), 0) as qty
        FROM inventory_transaction_items
        WHERE material_id = ${materialId}
          AND (to_status IN ('AVAILABLE', 'RETURNED_GOOD') OR from_status = 'AVAILABLE')`
  );
  return Math.max(
    0,
    Number((result as unknown as { qty: string }[])[0]?.qty ?? 0)
  );
}

/** Get qty currently with a specific technician */
export async function getTechnicianQty(
  technicianId: string,
  materialId: string
): Promise<number> {
  const result = await db.execute(
    sql`SELECT COALESCE(SUM(
          CASE
            WHEN to_status = 'WITH_TECHNICIAN' THEN ABS(quantity_delta::numeric)
            WHEN from_status = 'WITH_TECHNICIAN' THEN -quantity::numeric
            ELSE 0
          END
        ), 0) as qty
        FROM inventory_transaction_items iti
        JOIN inventory_transactions it ON it.id = iti.transaction_id
        WHERE it.technician_id = ${technicianId}
          AND iti.material_id = ${materialId}`
  );
  return Math.max(
    0,
    Number((result as unknown as { qty: string }[])[0]?.qty ?? 0)
  );
}
