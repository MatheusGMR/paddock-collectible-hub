import { useEffect } from "react";

// A landing pública agora é uma página estática (public/conheca.html):
// carrega sem o app, tem meta tags próprias para WhatsApp/Instagram/Facebook
// e preserva UTMs e hash no redirecionamento.
const Landing = () => {
  useEffect(() => {
    window.location.replace("/conheca.html" + window.location.search + window.location.hash);
  }, []);
  return <div className="min-h-screen bg-background" />;
};

export default Landing;
