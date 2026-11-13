import './globals.css';

export const metadata = {
  title: 'Prediksi Koin & Saham AS Oort dengan Kronos',
  description: 'Prediksi pasar kripto dan saham AS dengan Kronos (NeoQuasar/Kronos-mini) lewat HTTP. Atur koin atau saham apa pun, dan lihat garis harga prediksinya.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
