import { useState, useEffect } from "react";
import { MobileUserCard } from "./MobileUserCard";

interface ResponsiveTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
  }[];
  emptyMessage?: string;
  mobileCardComponent?: (row: any) => React.ReactNode;
}

export function ResponsiveTable({ 
  data, 
  columns, 
  emptyMessage = "No data available",
  mobileCardComponent 
}: ResponsiveTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="md:hidden">
        {mobileCardComponent 
          ? data.map(mobileCardComponent)
          : data.map((row, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg">
                {columns.map((column) => (
                  <div key={column.key} className="mb-2">
                    <span className="font-medium text-gray-700">
                      {column.label}:
                    </span>{" "}
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </div>
                ))}
              </div>
            ))
        }
      </div>
    );
  }

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
