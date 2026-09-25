import Swal from 'sweetalert2';

export const rionAlert = (title, text, icon = 'info') => {
  return Swal.fire({
    title: title.toUpperCase(),
    text: text,
    icon: icon,
    background: '#0A101F',
    color: '#fff',
    confirmButtonColor: '#4F46E5', // Indigo color matching your tech dash
    borderRadius: '30px',
    customClass: {
      title: 'font-black italic tracking-tighter',
      popup: 'border border-indigo-500/20 shadow-[0_0_20px_rgba(79,70,229,0.2)]'
    }
  });
};