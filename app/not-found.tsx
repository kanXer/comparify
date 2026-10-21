import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold text-white mb-2">404 - Page Not Found</h2>
      <p className="text-xs text-gray-400 mb-4">The requested page does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition"
      >
        Return Home
      </Link>
    </div>
  );
}
