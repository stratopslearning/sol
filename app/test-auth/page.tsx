import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { redirect } from 'next/navigation';

export default async function TestAuthPage() {
  const user = await getOrCreateUser();
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">User Sync Test</h1>
        
        <div className="bg-black/30 border border-white/10 rounded-xl p-6 backdrop-blur-md">
          <h2 className="text-xl font-semibold mb-4">User Data from Database:</h2>
          
          <div className="space-y-3">
            <div>
              <span className="text-white/60">ID:</span>
              <span className="ml-2 font-mono text-sm">{user.id}</span>
            </div>
            
            <div>
              <span className="text-white/60">Clerk ID:</span>
              <span className="ml-2 font-mono text-sm">{user.clerkId}</span>
            </div>
            
            <div>
              <span className="text-white/60">Email:</span>
              <span className="ml-2">{user.email}</span>
            </div>
            
            <div>
              <span className="text-white/60">Name:</span>
              <span className="ml-2">{user.firstName} {user.lastName}</span>
            </div>
            
            <div>
              <span className="text-white/60">Role:</span>
              <span className="ml-2 px-2 py-1 bg-blue-500/20 rounded text-sm">
                {user.role}
              </span>
            </div>
            
            <div>
              <span className="text-white/60">Paid:</span>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                user.paid ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {user.paid ? 'Yes' : 'No'}
              </span>
            </div>
            
            <div>
              <span className="text-white/60">Created:</span>
              <span className="ml-2 text-sm">{user.createdAt.toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm">
              ✅ User successfully synced from Clerk to NeonDB!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 