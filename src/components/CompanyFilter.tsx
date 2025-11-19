import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCompanies } from './CompanyContext';
import { useAuth } from './AuthContext';

interface Props {
  value: string;
  onChange: (val: string) => void;
  includeAllOption?: boolean;
  disabledRoles?: string[]; // roles for which select is disabled
  hideIfCompanyAdmin?: boolean; // if true and user is company admin, don't render component (auto-select their company)
}

export const CompanyFilter: React.FC<Props> = ({ value, onChange, includeAllOption = true, disabledRoles = [], hideIfCompanyAdmin = false }) => {
  const { companies } = useCompanies();
  const { user } = useAuth();

  const isCompanyAdmin = user?.role === 'company_admin';
  const isDisabled = user && disabledRoles.includes(user.role);

  // When hideIfCompanyAdmin is true and the user is a company admin,
  // auto-select their company once (via effect) and don't render the selector.
  useEffect(() => {
    if (hideIfCompanyAdmin && isCompanyAdmin) {
      const companyId = user?.companyId || 'all';
      if (value !== companyId) {
        // schedule selection change after render
        onChange(companyId!);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideIfCompanyAdmin, isCompanyAdmin]);

  if (hideIfCompanyAdmin && isCompanyAdmin) {
    return null;
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px]" disabled={!!isDisabled}>
        <SelectValue placeholder={includeAllOption ? 'All Companies' : 'Select Company'} />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && <SelectItem value="all">All Companies</SelectItem>}
        {companies.map(c => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompanyFilter;
