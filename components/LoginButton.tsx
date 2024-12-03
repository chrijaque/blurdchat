import { useAuth } from '@/lib/AuthContext';

export default function LoginButton() {
  const { user, signInWithGoogle, signOut } = useAuth();

  return (
    <button
      onClick={user ? signOut : signInWithGoogle}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
    >
      {user ? 'Log ud' : 'Log ind med Google'}
    </button>
  );
} 