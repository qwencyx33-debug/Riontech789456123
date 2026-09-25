import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { RefreshCw, Database, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ServiceLogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('service_reports')
      .select(`
        id, 
        service_performed, 
        items_used, 
        completion_time, 
        technician_name, 
        created_at,
        appointments (
          full_name, 
          address, 
          service_type, 
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching logs:", error.message);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, []);

  
  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('service_logs_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_reports' }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchLogs]);

  
  const handleUpdate = async (id, updatedData) => {
    const { error } = await supabase
      .from('service_reports')
      .update(updatedData)
      .eq('id', id);

    if (error) {
      alert("Update failed: " + error.message);
    } else {
      
      fetchLogs();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <RefreshCw className="animate-spin" size={14} /> Synchronizing with database...
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <h2 className="text-white font-black uppercase tracking-widest">Service Reports</h2>
          <button onClick={fetchLogs} className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {}
      <div className="flex-1 overflow-hidden">
        {logs.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-700">
            <Database size={48} className="mb-4 opacity-20" />
            <p>Walang records na nahanap sa database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4 h-full">
            {}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceLogsView;