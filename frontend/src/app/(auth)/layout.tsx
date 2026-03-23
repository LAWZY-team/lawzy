/**
 * Auth layout - Children (login/register pages) use AuthLayout
 * with page-specific leftPanel (steps or benefits).
 */
export default function AuthLayoutRoute({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950">{children}</div>;
}
