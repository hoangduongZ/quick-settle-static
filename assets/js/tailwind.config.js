window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      colors: {
        // Bảng màu trung tính, tin cậy cho công cụ chốt khoản nhóm.
        brand: '#4F46E5',   // indigo – hành động chính
        brand2: '#4338CA',  // indigo đậm – header, trạng thái hover
        accent: '#34D399',  // emerald – nhấn tích cực, vòng focus
        accent2: '#0D9488', // teal – bước hoàn tất
        danger: '#E11D48',  // rose – thao tác xóa / số dư âm
        ink: '#0F172A'      // slate – chữ chính
      },
      boxShadow: {
        card: '0 18px 45px rgba(15, 23, 42, .10)',
        insetRail: 'inset 0 0 0 1px rgba(15,23,42,.06)'
      }
    }
  }
};
