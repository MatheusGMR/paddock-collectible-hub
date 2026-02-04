import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import paddockWordmark from "@/assets/paddock-wordmark-new.png";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border pt-safe">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img
            src={paddockWordmark}
            alt="Paddock"
            style={{ height: 24, width: "auto" }}
            className="object-contain"
          />
          <div className="w-9" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 pb-safe">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Política de Privacidade
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>

        <div className="space-y-6 text-foreground/90 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Introdução</h2>
            <p>
              O Paddock ("nós", "nosso" ou "aplicativo") está comprometido em proteger sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas 
              informações quando você utiliza nosso aplicativo móvel e serviços relacionados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Informações que Coletamos</h2>
            
            <h3 className="font-medium text-foreground mt-4 mb-2">2.1 Informações fornecidas por você</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Informações de conta: e-mail, nome de usuário e foto de perfil</li>
              <li>Dados de coleção: informações sobre os itens colecionáveis que você adiciona</li>
              <li>Fotos: imagens capturadas através do scanner de miniaturas</li>
              <li>Conteúdo gerado: posts, comentários e mensagens</li>
            </ul>

            <h3 className="font-medium text-foreground mt-4 mb-2">2.2 Informações coletadas automaticamente</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Dados de uso: páginas visitadas, recursos utilizados e interações</li>
              <li>Informações do dispositivo: modelo, sistema operacional e identificadores</li>
              <li>Dados de localização: apenas quando autorizado, para funcionalidades específicas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Como Usamos suas Informações</h2>
            <p className="mb-2">Utilizamos as informações coletadas para:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Processar o reconhecimento de miniaturas via inteligência artificial</li>
              <li>Gerenciar sua conta e coleção digital</li>
              <li>Enviar notificações sobre novidades, lançamentos e alertas de mercado</li>
              <li>Conectar você a outros colecionadores</li>
              <li>Analisar tendências de uso para melhorar a experiência</li>
              <li>Prevenir fraudes e garantir a segurança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Compartilhamento de Informações</h2>
            <p className="mb-2">Podemos compartilhar suas informações nas seguintes situações:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Com outros usuários:</strong> seu perfil público, posts e coleção (conforme suas configurações de privacidade)</li>
              <li><strong>Prestadores de serviço:</strong> empresas que nos ajudam a operar o aplicativo (hospedagem, análise, IA)</li>
              <li><strong>Requisitos legais:</strong> quando exigido por lei ou para proteger direitos</li>
            </ul>
            <p className="mt-2">
              <strong>Não vendemos suas informações pessoais a terceiros.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Uso de Câmera e Fotos</h2>
            <p>
              O Paddock utiliza a câmera do seu dispositivo para escanear e identificar miniaturas colecionáveis. 
              As imagens capturadas são processadas por nossa inteligência artificial para reconhecimento e podem 
              ser armazenadas em sua coleção pessoal. Você tem controle total sobre quais imagens são salvas e 
              compartilhadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, 
              incluindo criptografia em trânsito (HTTPS/TLS), armazenamento seguro e autenticação biométrica 
              opcional. No entanto, nenhum método de transmissão pela internet é 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Seus Direitos</h2>
            <p className="mb-2">De acordo com a LGPD (Lei Geral de Proteção de Dados), você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou incorretos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Revogar consentimentos fornecidos</li>
              <li>Solicitar portabilidade dos dados</li>
              <li>Obter informações sobre compartilhamento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Retenção de Dados</h2>
            <p>
              Mantemos suas informações enquanto sua conta estiver ativa ou conforme necessário para 
              fornecer nossos serviços. Você pode solicitar a exclusão de sua conta e dados a qualquer 
              momento através das configurações do aplicativo.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Menores de Idade</h2>
            <p>
              O Paddock não é destinado a menores de 13 anos. Não coletamos intencionalmente informações 
              de crianças. Se você acredita que coletamos dados de um menor, entre em contato conosco 
              imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre 
              alterações significativas através do aplicativo ou por e-mail. O uso continuado do 
              aplicativo após as alterações constitui aceitação da política atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">11. Contato</h2>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre nossas práticas de 
              privacidade, entre em contato conosco:
            </p>
            <p className="mt-2">
              <strong>E-mail:</strong> privacidade@paddock.app
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Paddock. Todos os direitos reservados.</p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
