import { db } from './shared/db/client';
import {
  getCategoriesOrderedByCreatedAtDesc,
  getContactSubmissionsOrderedByCreatedAtDesc,
  getInventoryItemsWithDetails,
  getInventoryMovementsWithProductName,
  getImsSuppliersOrderedByCreatedAtDesc,
  getPricingPlansOrderedByCreatedAtDesc,
  getProductsWithCategoryDetails,
  getSimulatedOrdersWithItems,
} from './features/superadmin/queries';

async function run() {
  try {
    console.log("Categories..."); await getCategoriesOrderedByCreatedAtDesc();
    console.log("Contact Submissions..."); await getContactSubmissionsOrderedByCreatedAtDesc();
    console.log("Inventory Items..."); await getInventoryItemsWithDetails();
    console.log("Inventory Movements..."); await getInventoryMovementsWithProductName();
    console.log("Suppliers..."); await getImsSuppliersOrderedByCreatedAtDesc();
    console.log("Pricing Plans..."); await getPricingPlansOrderedByCreatedAtDesc();
    console.log("Products..."); await getProductsWithCategoryDetails();
    console.log("Simulated Orders..."); await getSimulatedOrdersWithItems();
    console.log("SUCCESS");
  } catch (err) {
    console.error("ERROR IN QUERIES:", err);
  }
}
run();
