const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-lms-jwt-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, companyId: user.companyId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function mapUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roleId: row.role_id,
    companyId: row.company_id,
    isActive: row.is_active,
    deactivatedByCompany: row.deactivated_by_company,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    lastLoginAt: row.last_login_at?.toISOString?.() || row.last_login_at || undefined,
  };
}

function mapCompanyRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    logo: row.logo || undefined,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    isActive: row.is_active,
    isDeleted: row.is_deleted,
    blockReason: row.block_reason,
    subscriptionPlan: row.subscription_plan,
    maxUsers: row.max_users,
    monthlyPrice: row.monthly_price != null ? Number(row.monthly_price) : undefined,
    companyNameCustom: row.company_name_custom || undefined,
  };
}

function mapLeadRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    cin: row.cin,
    companyName: row.company_name,
    authorisedCapital: row.authorised_capital || undefined,
    paidUpCapital: row.paid_up_capital || undefined,
    dateOfIncorporation: row.date_of_incorporation || undefined,
    registeredAddress: row.registered_address || undefined,
    companyEmail: row.company_email || undefined,
    directors: row.directors || [],
    din: row.din || undefined,
    directorFirstName: row.director_first_name || undefined,
    directorLastName: row.director_last_name || undefined,
    mobile: row.mobile || undefined,
    directorEmail: row.director_email || undefined,
    status: row.status,
    isAssigned: row.is_assigned,
    assignedTo: row.assigned_to,
    assignedAt: row.assigned_at?.toISOString?.() || row.assigned_at,
    followUpDate: row.follow_up_date,
    nextFollowUpDate: row.next_follow_up_date,
    notes: row.notes || undefined,
    uploadedBy: row.uploaded_by || undefined,
    invoiceNo: row.invoice_no || undefined,
    projectValue: row.project_value || undefined,
    convertedBy: row.converted_by || undefined,
    convertedAt: row.converted_at?.toISOString?.() || row.converted_at,
    lostRemark: row.lost_remark || undefined,
    lostBy: row.lost_by || undefined,
    lostAt: row.lost_at?.toISOString?.() || row.lost_at,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

function leadToDb(lead) {
  const out = {};
  if (lead.companyId !== undefined) out.company_id = lead.companyId;
  if (lead.cin !== undefined) out.cin = lead.cin;
  if (lead.companyName !== undefined) out.company_name = lead.companyName;
  if (lead.authorisedCapital !== undefined) out.authorised_capital = lead.authorisedCapital;
  if (lead.paidUpCapital !== undefined) out.paid_up_capital = lead.paidUpCapital;
  if (lead.dateOfIncorporation !== undefined) out.date_of_incorporation = lead.dateOfIncorporation;
  if (lead.registeredAddress !== undefined) out.registered_address = lead.registeredAddress;
  if (lead.companyEmail !== undefined) out.company_email = lead.companyEmail;
  if (lead.directors !== undefined) out.directors = JSON.stringify(lead.directors);
  if (lead.din !== undefined) out.din = lead.din;
  if (lead.directorFirstName !== undefined) out.director_first_name = lead.directorFirstName;
  if (lead.directorLastName !== undefined) out.director_last_name = lead.directorLastName;
  if (lead.mobile !== undefined) out.mobile = lead.mobile;
  if (lead.directorEmail !== undefined) out.director_email = lead.directorEmail;
  if (lead.status !== undefined) out.status = lead.status;
  if (lead.isAssigned !== undefined) out.is_assigned = lead.isAssigned;
  if (lead.assignedTo !== undefined) out.assigned_to = lead.assignedTo;
  if (lead.assignedAt !== undefined) out.assigned_at = lead.assignedAt;
  if (lead.followUpDate !== undefined) out.follow_up_date = lead.followUpDate;
  if (lead.nextFollowUpDate !== undefined) out.next_follow_up_date = lead.nextFollowUpDate;
  if (lead.notes !== undefined) out.notes = lead.notes;
  if (lead.uploadedBy !== undefined) out.uploaded_by = lead.uploadedBy;
  if (lead.invoiceNo !== undefined) out.invoice_no = lead.invoiceNo;
  if (lead.projectValue !== undefined) out.project_value = lead.projectValue;
  if (lead.convertedBy !== undefined) out.converted_by = lead.convertedBy;
  if (lead.convertedAt !== undefined) out.converted_at = lead.convertedAt;
  if (lead.lostRemark !== undefined) out.lost_remark = lead.lostRemark;
  if (lead.lostBy !== undefined) out.lost_by = lead.lostBy;
  if (lead.lostAt !== undefined) out.lost_at = lead.lostAt;
  return out;
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
  mapUserRow,
  mapCompanyRow,
  mapLeadRow,
  leadToDb,
};
