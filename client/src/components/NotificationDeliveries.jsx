import { useEffect,useState } from 'react';
import axios from 'axios';
export default function NotificationDeliveries() {
  const [jobs,setJobs]=useState([]); const [error,setError]=useState('');
  const url=(import.meta.env.VITE_API_URL || 'http://localhost:5000')+'/api/notifications';
  const load=()=>axios.get(url).then(r=>{setJobs(r.data);setError('');}).catch(()=>setError('Could not load delivery status'));
  useEffect(()=>{load();const timer=setInterval(load,30000);return()=>clearInterval(timer);},[]);
  const retry=async job=>{const uncertain=job.status==='uncertain';if(uncertain&&!window.confirm('The previous delivery may have succeeded. Retry only after checking with the recipient; this may send a duplicate.'))return;try{await axios.post(url+'/'+job._id+'/retry',{confirmUncertain:uncertain});load();}catch{setError('Could not retry delivery');}};
  return <details className="border rounded p-4 my-4"><summary className="font-semibold cursor-pointer">Payment notification delivery</summary><p className="text-sm">Failures retry automatically up to five attempts. Uncertain deliveries require review.</p>{error&&<p>{error}</p>}<div className="overflow-auto max-h-80"><table className="w-full text-sm"><thead><tr><th>Channel</th><th>Recipient</th><th>Status</th><th>Attempts</th><th>Last error</th><th>Action</th></tr></thead><tbody>{jobs.map(job=><tr key={job._id}><td>{job.channel}</td><td>{job.recipient}</td><td>{job.status}</td><td>{job.attempts}</td><td>{job.lastError}</td><td>{['failed','uncertain'].includes(job.status)&&<button onClick={()=>retry(job)} className="underline">Retry</button>}</td></tr>)}</tbody></table></div></details>;
}
