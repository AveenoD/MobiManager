-- MobiManager Row Level Security Policies
-- This script runs when PostgreSQL container initializes

-- Enable RLS on all tenant tables
ALTER TABLE "Admin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shop" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubAdmin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Repair" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RepairPartUsed" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RechargeTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BrandDict" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModelDict" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CategoryDict" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IssueDict" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperatorDict" ENABLE ROW LEVEL SECURITY;

-- Policy: Admin sees only their own data
CREATE POLICY admin_isolation_admin ON "Admin"
  FOR ALL USING ("id"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_shop ON "Shop"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_subscription ON "Subscription"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_subadmin ON "SubAdmin"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_product ON "Product"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_stockmovement ON "StockMovement"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_sale ON "Sale"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_saleitem ON "SaleItem"
  FOR ALL USING ("saleId" IN (SELECT id FROM "Sale" WHERE "adminId"::text = current_setting('app.current_admin_id', TRUE)));

CREATE POLICY admin_isolation_repair ON "Repair"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_repairpartused ON "RepairPartUsed"
  FOR ALL USING ("repairId" IN (SELECT id FROM "Repair" WHERE "adminId"::text = current_setting('app.current_admin_id', TRUE)));

CREATE POLICY admin_isolation_rechargetransfer ON "RechargeTransfer"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_auditlog ON "AuditLog"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_customer ON "Customer"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_branddict ON "BrandDict"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_modeldict ON "ModelDict"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_categorydict ON "CategoryDict"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_issuedict ON "IssueDict"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

CREATE POLICY admin_isolation_operatordict ON "OperatorDict"
  FOR ALL USING ("adminId"::text = current_setting('app.current_admin_id', TRUE));

-- SuperAdmin bypass policy for all tables
CREATE POLICY superadmin_bypass ON "Admin" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_shop ON "Shop" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_subscription ON "Subscription" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_subadmin ON "SubAdmin" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_product ON "Product" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_stockmovement ON "StockMovement" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_sale ON "Sale" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_saleitem ON "SaleItem" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_repair ON "Repair" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_repairpartused ON "RepairPartUsed" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_rechargetransfer ON "RechargeTransfer" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_auditlog ON "AuditLog" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_customer ON "Customer" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_branddict ON "BrandDict" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_modeldict ON "ModelDict" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_categorydict ON "CategoryDict" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_issuedict ON "IssueDict" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');
CREATE POLICY superadmin_bypass_operatordict ON "OperatorDict" FOR ALL USING (current_setting('app.is_super_admin', TRUE) = 'true');

-- Force RLS for superadmin bypass (Prisma needs this)
ALTER TABLE "Admin" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Shop" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SubAdmin" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "StockMovement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Sale" FORCE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Repair" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RepairPartUsed" FORCE ROW LEVEL SECURITY;
ALTER TABLE "RechargeTransfer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;
ALTER TABLE "BrandDict" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ModelDict" FORCE ROW LEVEL SECURITY;
ALTER TABLE "CategoryDict" FORCE ROW LEVEL SECURITY;
ALTER TABLE "IssueDict" FORCE ROW LEVEL SECURITY;
ALTER TABLE "OperatorDict" FORCE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_email ON "Admin"(email);
CREATE INDEX IF NOT EXISTS idx_admin_phone ON "Admin"(phone);
CREATE INDEX IF NOT EXISTS idx_shop_admin ON "Shop"("adminId");
CREATE INDEX IF NOT EXISTS idx_product_admin ON "Product"("adminId");
CREATE INDEX IF NOT EXISTS idx_sale_admin ON "Sale"("adminId");
CREATE INDEX IF NOT EXISTS idx_repair_admin ON "Repair"("adminId");
CREATE INDEX IF NOT EXISTS idx_auditlog_admin ON "AuditLog"("adminId");
CREATE INDEX IF NOT EXISTS idx_customer_admin ON "Customer"("adminId");
CREATE INDEX IF NOT EXISTS idx_branddict_admin ON "BrandDict"("adminId");
CREATE INDEX IF NOT EXISTS idx_modeldict_admin ON "ModelDict"("adminId");
CREATE INDEX IF NOT EXISTS idx_categorydict_admin ON "CategoryDict"("adminId");
CREATE INDEX IF NOT EXISTS idx_issuedict_admin ON "IssueDict"("adminId");
CREATE INDEX IF NOT EXISTS idx_operatordict_admin ON "OperatorDict"("adminId");

-- Single SuperAdmin enforce (max 1 row at DB level)
CREATE UNIQUE INDEX enforce_single_super_admin ON "SuperAdmin" ((true));