import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reserveProductStock, applyStockReservation } from '@/features/inventory/reservation';

describe('Inventory Reservation', () => {
  let mockTx: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockFor = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ for: mockFor });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    const mockReturning = vi.fn().mockResolvedValue([]);
    const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    
    const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) });

    mockTx = {
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    };
  });

  describe('reserveProductStock()', () => {
    it('returns error if central inventory record does not exist', async () => {
      // Setup mock to return empty array (no inventory)
      mockTx.select().from().where().for().limit = vi.fn().mockResolvedValue([]);

      const result = await reserveProductStock(mockTx, 'prod-1', 5);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/Product has no inventory record/);
      }
    });

    it('returns error if central inventory quantity is insufficient', async () => {
      // Setup mock to return central inventory with only 2 units
      mockTx.select().from().where().for().limit = vi.fn().mockResolvedValue([
        { id: 'inv-1', quantity: 2 }
      ]);

      const result = await reserveProductStock(mockTx, 'prod-1', 5);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/only has 2 units in stock/);
      }
    });

    it('returns success reservation if central inventory is sufficient', async () => {
      // Setup mock to return central inventory with 10 units
      mockTx.select().from().where().for().limit = vi.fn().mockResolvedValue([
        { id: 'inv-1', quantity: 10 }
      ]);

      const result = await reserveProductStock(mockTx, 'prod-1', 5);
      
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.reservation.centralInventoryId).toBe('inv-1');
        expect(result.reservation.branchInventoryId).toBeUndefined();
      }
    });
  });

  describe('applyStockReservation()', () => {
    it('throws error if central stock update fails', async () => {
      // Simulate zero rows returned from the returning() clause (meaning where condition failed)
      mockTx.update().set().where().returning = vi.fn().mockResolvedValue([]);

      await expect(
        applyStockReservation(mockTx, 5, { centralInventoryId: 'inv-1' }, { userId: 'u1', reason: 'sale' })
      ).rejects.toThrow('Insufficient central stock during checkout.');
    });

    it('successfully updates central stock and inserts movement log', async () => {
      // Simulate successful update returning the new quantity
      mockTx.update().set().where().returning = vi.fn().mockResolvedValue([
        { quantity: 5 } // started with 10, depleted 5, new qty is 5
      ]);

      await applyStockReservation(
        mockTx, 
        5, 
        { centralInventoryId: 'inv-1' }, 
        { userId: 'u1', reason: 'sale' }
      );

      // Verify movement was inserted
      expect(mockTx.insert).toHaveBeenCalledTimes(1);
      
      const insertValuesArg = mockTx.insert().values.mock.calls[0][0];
      expect(insertValuesArg).toEqual({
        inventoryId: 'inv-1',
        type: 'sale_depletion',
        quantityChanged: -5,
        previousQuantity: 10, // 5 + 5
        newQuantity: 5,
        reason: 'sale',
        userId: 'u1'
      });
    });
  });
});
