# Dilnova Commerce Hub

An enterprise-grade, multi-tenant eCommerce and storefront console sandbox built with Next.js, Clerk Authentication, and PostgreSQL (via Drizzle ORM). It features a robust Role-Based Access Control (RBAC) system, Point of Sale (POS) Billing Register, and a Premium Inventory Management System (IMS).

---

## 🚀 Key Features

*   **Multi-Vendor Context Isolation**: All products, inventories, and receipts are isolated securely by Clerk organization IDs (`orgId`) to support secure multi-tenancy.
*   **Point of Sale (POS) Billing Register**: Process customer sales offline with real-time stock depletion, branch context validation, and printable thermal receipts.
*   **Premium Inventory Management System (IMS)**:
    *   Central stock tracking (SKU, bin location, low-stock threshold warning).
    *   Stock adjustment and restock/loss logging.
    *   Supplier directory management.
    *   Multi-branch inventory allocation and branch member assignments.

---

## 🛡️ Role-Based Access Control (RBAC)

The application implements three distinct layers of identity roles:

### 1. Superadmin (Platform Level)
*   **Authorization**: Configured in Clerk user-level metadata (`publicMetadata.role === "admin"`).
*   **Privileges**: Has access to the global `/superadmin` console to configure system-wide parameters (e.g. system name, custom logo, media limits).

### 2. Organization Administrator (`org:admin`)
*   **Privileges**:
    *   **Members Console (`/admin`)**: Exclusively access the admin console to view memberships and assign roles (promote/demote members between member and admin).
    *   **Manage Catalog (`/vendor/products`)**: Full access to the Product Catalog dashboard, central inventory workspace, supplier management, and branch configurations.
    *   **POS Register (`/vendor/billing`)**: Full checkout permission across **any** active branch register without branch membership assignment checks.
    *   **Create/Delete Listings**: Full permission to add new catalog items and delete existing ones.

### 3. Organization Member (`org:member`)
*   **Privileges**:
    *   **+ Add Item (`/vendor/products/add`)**: Can add new listings to the catalog (but cannot delete items).
    *   **POS Register (`/vendor/billing`)**: Can run checkouts (must be assigned to a specific branch if multi-branch tracking is enabled).
    *   **Storefront Console (`/vendor`)**: Access profile fields to modify storefront metadata (Description, Address, Phone, Banner URL).
    *   *Restrictions:* Cannot view the Members Console, manage roles, or access the overall Manage Catalog/Inventory dashboard (`/vendor/products`).

---

## 🛠️ Getting Started

### Prerequisites

*   Node.js (v18+)
*   pnpm (v8+)
*   PostgreSQL Database
*   Clerk Account & API Keys
*   Cloudinary Account (for catalog image uploads)

### Setup Env

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_pub_key
CLERK_SECRET_KEY=your_clerk_secret_key
DATABASE_URL=postgresql://user:pass@host:port/dbname
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Install Dependencies & Build

```bash
# Install packages
pnpm install

# Apply database migrations (production-safe)
pnpm db:migrate

# Optional: push schema directly for local prototyping only (not for production)
# pnpm db:push

# Verify migration journal matches SQL files
pnpm db:verify

# Start the dev server
pnpm dev

# Build for production
pnpm build
```

---

## 📝 Latest Changes (Version 1.2.0)

*   **Role Restructuring for Catalog management**: Restricted the **Manage Catalog** and **Inventory Workspace** (`/vendor/products`) dashboard strictly to `org:admin`.
*   **Access Path for Members**: Retained permission for `org:member` to use the **POS Register** (`/vendor/billing`) and to list new items using **+ Add Item** (`/vendor/products/add`).
*   **Dynamic UI Banner**: Replaced the admin-only catalog banner on the dashboard with a tailored, green-themed banner for regular members allowing them to add items without catalog access.
*   **Navigation & Sidebar Upgrades**: Added direct dynamic header links to `/admin` (Members Console) for administrators, and updated context-aware back-links on checkout screens.
