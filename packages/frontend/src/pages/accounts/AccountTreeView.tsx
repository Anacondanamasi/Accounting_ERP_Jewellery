import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface AccountTreeViewProps {
  accounts: any[];
  groups: any[];
  onEditAccount: (account: any) => void;
}

export const AccountTreeView = ({ accounts, groups, onEditAccount }: AccountTreeViewProps) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const hierarchy = useMemo(() => {
    const tree: any = {};
    // Group accounts by Heading -> Type -> Group
    accounts.forEach((acc) => {
      const heading = acc.heading || "Uncategorized";
      const type = acc.type || "Other";
      const group = acc.group || "Ungrouped";

      if (!tree[heading]) tree[heading] = {};
      if (!tree[heading][type]) tree[heading][type] = {};
      if (!tree[heading][type][group]) tree[heading][type][group] = [];

      tree[heading][type][group].push(acc);
    });
    return tree;
  }, [accounts]);

  const renderAccounts = (accList: any[], prefix: string) => {
    return accList.map((acc) => (
      <div key={`acc-${acc.id}`} className="flex items-center justify-between py-2 pl-12 pr-4 hover:bg-slate-50 border-b border-border/50 group">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="font-mono text-xs font-bold text-charcoal w-20">{acc.code}</span>
          <span className="text-sm font-medium text-slate-700">{acc.name}</span>
          {acc.isControlAccount && (
            <span className="ml-2 rounded-full bg-ruby/10 px-2 py-0.5 text-[10px] font-bold text-ruby">
              Control
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <span className="font-mono text-sm font-medium text-slate-700">{formatCurrency(acc.openingBalance)}</span>
          <button 
            className="text-xs font-semibold text-gold opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEditAccount(acc)}
          >
            Edit
          </button>
        </div>
      </div>
    ));
  };

  const renderGroups = (groupsMap: any, prefix: string) => {
    return Object.entries(groupsMap).map(([groupName, accList]: [string, any]) => {
      const id = `${prefix}-${groupName}`;
      const isExpanded = expanded[id] ?? false;
      const totalBalance = accList.reduce((sum: number, acc: any) => sum + (acc.openingBalance || 0), 0);

      return (
        <div key={id}>
          <div 
            className="flex cursor-pointer items-center justify-between py-2 pl-8 pr-4 hover:bg-slate-50 border-b border-border/50"
            onClick={() => toggle(id)}
          >
            <div className="flex items-center gap-2">
              {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              <Folder className="h-4 w-4 text-gold" />
              <span className="text-sm font-bold text-slate-800">{groupName}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {accList.length} accounts
              </span>
            </div>
            <span className="font-mono text-sm font-bold text-slate-700">{formatCurrency(totalBalance)}</span>
          </div>
          {isExpanded && renderAccounts(accList, id)}
        </div>
      );
    });
  };

  const renderTypes = (typesMap: any, prefix: string) => {
    return Object.entries(typesMap).map(([typeName, groupsMap]: [string, any]) => {
      const id = `${prefix}-${typeName}`;
      const isExpanded = expanded[id] ?? false;
      
      return (
        <div key={id}>
          <div 
            className="flex cursor-pointer items-center gap-2 py-2 pl-4 pr-4 bg-slate-50/80 border-b border-border"
            onClick={() => toggle(id)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-600">{typeName}</span>
          </div>
          {isExpanded && renderGroups(groupsMap, id)}
        </div>
      );
    });
  };

  return (
    <div className="rounded-card border-2 border-border bg-card shadow-sm overflow-hidden">
      {Object.entries(hierarchy).map(([heading, typesMap]) => {
        const id = `heading-${heading}`;
        const isExpanded = expanded[id] ?? true; // Headings expanded by default

        return (
          <div key={id} className="border-b-4 border-b-border last:border-b-0">
            <div 
              className="flex cursor-pointer items-center gap-2 bg-charcoal text-white py-3 px-4"
              onClick={() => toggle(id)}
            >
              {isExpanded ? <ChevronDown className="h-5 w-5 opacity-70" /> : <ChevronRight className="h-5 w-5 opacity-70" />}
              <span className="text-lg font-display font-bold tracking-widest uppercase">{heading}</span>
            </div>
            {isExpanded && renderTypes(typesMap, id)}
          </div>
        );
      })}
      {Object.keys(hierarchy).length === 0 && (
        <div className="p-8 text-center text-muted">No accounts found</div>
      )}
    </div>
  );
};
