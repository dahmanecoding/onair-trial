"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import { Camera, Save, LogOut } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUser(session.user);
      setSessionToken(session.access_token);
      setName(session.user.user_metadata?.full_name || "");
      setAvatarUrl(session.user.user_metadata?.avatar_url || "https://api.dicebear.com/9.x/avataaars/svg?seed=OnAir");
      
      // Fetch sync logs (mocked for now, as we'd need to query a logs table or tokens table)
      const { data: tokens } = await supabase.from("google_health_tokens").select("updated_at, scope").eq("user_id", user.id).maybeSingle();
      if (tokens) {
        setLogs([{ id: 1, time: new Date(tokens.updated_at).toLocaleString(), msg: "Successfully synced with Google Health" }]);
      }
    })();
  }, [router]);

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name, avatar_url: avatarUrl }
      });
      if (error) throw error;
      alert("Profile updated!");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <>
      <Header title="Profile" showDatePill={false} />
      
      <div className="space-y-6 rise-in pb-10">
        
        {/* Avatar Section */}
        <div className="glass p-6 flex flex-col items-center gap-4">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20">
            <img src={avatarUrl || ""} alt="Avatar" className="w-full h-full object-cover" />
            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition cursor-pointer">
              <Camera size={24} className="text-white mb-1" />
              <span className="text-[10px] font-bold text-white">Upload</span>
              <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={uploading} />
            </label>
          </div>
          {uploading && <span className="text-xs text-accent animate-pulse">Uploading...</span>}
        </div>

        {/* Profile Info */}
        <div className="glass p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold tracking-widest uppercase opacity-70 mb-2">Display Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          
          <button 
            onClick={saveProfile} 
            disabled={saving}
            className="w-full bg-accent/20 hover:bg-accent/30 text-accent font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>

        {/* Google Health Integration */}
        <div className="glass p-6 space-y-4">
          <h3 className="text-sm font-bold border-b border-white/10 pb-2 mb-4">Google Health Integration</h3>
          <a href={`/api/connect?token=${sessionToken}`} className="block w-full text-center bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition">
            Reconnect Google Health
          </a>

          <div className="mt-6">
            <h4 className="text-[10px] font-bold tracking-widest uppercase opacity-70 mb-2">Sync Logs</h4>
            <div className="bg-black/30 rounded-xl p-4 font-mono text-[10px] h-32 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <span className="opacity-50">No recent sync logs.</span>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="border-b border-white/5 pb-2">
                    <span className="opacity-50">{log.time}</span>
                    <p className="text-green-400 mt-1">{log.msg}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button 
          onClick={handleSignOut}
          className="w-full glass p-4 flex items-center justify-center gap-2 text-red-400 font-bold hover:bg-red-400/10 transition"
        >
          <LogOut size={18} />
          Sign Out
        </button>

      </div>
    </>
  );
}
