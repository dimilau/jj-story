export const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full overflow-auto">
    <table className="w-full caption-bottom text-sm">{children}</table>
  </div>
);

export const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="border-b border-border bg-muted/50">{children}</thead>
);

export const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
);

export const TableRow = ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className="border-b border-border hover:bg-muted/50 transition-colors" {...props}>
    {children}
  </tr>
);

export const TableHead = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${className || ""}`}>
    {children}
  </th>
);

export const TableCell = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={`p-4 align-middle ${className || ""}`}>{children}</td>
);
