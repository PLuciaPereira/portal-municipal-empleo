'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, X, Info } from 'lucide-react';

export type LegalRole = 'postulante' | 'empresa';

export interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  role?: LegalRole;
  initialTab?: 'terminos' | 'privacidad';
  onClose: () => void;
  onAccept: () => void;
}

interface LegalSection {
  title: string;
  body: string;
}

interface LegalDocumentContent {
  terminos: LegalSection[];
  privacidad: LegalSection[];
}

const LEGAL_DOCUMENTS: Record<LegalRole, LegalDocumentContent> = {
  empresa: {
    terminos: [
      {
        title: '1. Objeto del Servicio Público de Empleo',
        body: 'El Portal Municipal de Empleo de Funes es una herramienta pública y gratuita administrada por la Municipalidad de Funes a través de su Oficina de Empleo, dependiente de la Secretaría de Desarrollo Económico y Productivo. Su finalidad es vincular la oferta laboral de personas residentes en la ciudad con las demandas de personal de empresas, industrias y comercios locales y de la región metropolitana.',
      },
      {
        title: '2. Proceso de Aprobación y Validación Comercial',
        body: 'Toda cuenta empresarial registrada ingresará en estado Pendiente de Aprobación. La Oficina de Empleo verificará la existencia y validez de la CUIT comercial y los datos de contacto brindados con el fin de resguardar a los postulantes frente a posibles ofertas fraudulentas. La Municipalidad se reserva el derecho de rechazar solicitudes que no acrediten actividad lícita o que incumplan con la normativa vigente.',
      },
      {
        title: '3. Gratuidad e Intermediación Transparente',
        body: 'El servicio no genera arancel, costo ni comisión alguna para la empresa ni para los postulantes. Queda terminantemente prohibido a los empleadores cobrar cualquier suma de dinero a los candidatos en concepto de postulación, examen, capacitación previa o trámites de ingreso.',
      },
      {
        title: '4. Compromiso de Publicación Responsable',
        body: 'Las empresas registradas se comprometen a publicar ofertas laborales reales, con descripciones fidedignas, requisitos objetivos y ajustadas a los principios de no discriminación (Ley Nacional N° 23.592), equidad de género y respeto a la legislación laboral y previsional argentina.',
      },
    ],
    privacidad: [
      {
        title: '1. Marco Normativo de Protección de Datos',
        body: 'Los datos personales recabados en este portal son tratados con estricta confidencialidad en cumplimiento de la Ley Nacional de Protección de los Datos Personales N° 25.326 y las ordenanzas municipales correspondientes.',
      },
      {
        title: '2. Uso Exclusivo con Fines Laborales',
        body: 'Los datos de contacto de la empresa se emplearán exclusivamente para la gestión institucional del servicio de empleo, envío de notificaciones sobre el estado de la cuenta, y comunicación oficial por parte del equipo orientador municipal. No se comercializarán ni cederán a terceros bajo ninguna circunstancia.',
      },
      {
        title: '3. Confidencialidad sobre Curriculums y Postulantes',
        body: 'La empresa que acceda a perfiles laborales o currículums derivados por la Oficina de Empleo asume el deber legal de confidencialidad y solo podrá utilizarlos a los fines del proceso de selección específico para el cual fueron remitidos, quedando prohibida su divulgación pública o reutilización para otros fines comerciales.',
      },
    ],
  },
  postulante: {
    terminos: [
      {
        title: '1. Objeto del Servicio Público de Empleo e Intermediación Gratuita',
        body: 'El Portal Municipal de Empleo de Funes es un servicio público y 100% gratuito administrado por la Municipalidad de Funes a través de la Oficina de Empleo (Secretaría de Desarrollo Económico y Productivo). Su finalidad es facilitar la inserción laboral vinculando de forma transparente la demanda de empleo con las búsquedas activas de comercios y empresas locales y de la región metropolitana.',
      },
      {
        title: '2. Veracidad de la Información y Declaración Jurada',
        body: 'El postulante declara bajo juramento que los datos personales, de contacto, experiencia laboral, formación académica y habilidades declarados en la plataforma son verídicos, exactos y comprobables. El municipio se reserva el derecho de dar de baja perfiles que consignen información manifiestamente falsa.',
      },
      {
        title: '3. Alcance de la Postulación e Intermediación Municipal',
        body: 'La inscripción en el portal y la postulación a las ofertas laborales implica la evaluación del perfil por el equipo técnico municipal para su eventual intermediación y derivación ante el empleador. El registro en el portal no garantiza la contratación efectiva, la cual queda sujeta a la decisión libre y soberana de las empresas empleadoras.',
      },
      {
        title: '4. Gratuidad Absoluta y Protección al Postulante',
        body: 'El servicio es enteramente gratuito. Ninguna persona física ni jurídica está autorizada a solicitar retribución, cobro de formulario, examen ni arancel alguno al postulante para participar de los procesos de selección derivados por este servicio público.',
      },
    ],
    privacidad: [
      {
        title: '1. Marco Normativo de Protección de Datos Personales',
        body: 'Los datos personales y laborales brindados por el postulante son tratados con estricta confidencialidad en el marco de la Ley Nacional N° 25.326 de Protección de Datos Personales y las ordenanzas municipales correspondientes.',
      },
      {
        title: '2. Confidencialidad y Carácter No Público de los Perfiles y CVs',
        body: 'La base completa de postulantes no es pública ni se encuentra expuesta en internet. Ninguna empresa ni usuario no autorizado puede buscar, visualizar ni descargar libremente el padrón de postulantes.',
      },
      {
        title: '3. Finalidad Exclusiva y Consentimiento de Derivación',
        body: 'Los datos de contacto y el currículum vitae serán compartidos únicamente con las empresas o comercios vinculados a las ofertas laborales para las cuales el postulante se haya postulado o haya sido formalmente intermediado por el orientador laboral municipal. Los datos no serán cedidos ni comercializados a terceros bajo ninguna circunstancia.',
      },
    ],
  },
};

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  role = 'postulante',
  initialTab = 'terminos',
  onClose,
  onAccept,
}) => {
  const [activeTab, setActiveTab] = useState<'terminos' | 'privacidad'>(initialTab);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);


  const handleClose = useCallback(() => {
    onClose();
    if (triggerElementRef.current) {
      triggerElementRef.current.focus();
    }
  }, [onClose]);

  // Manejo de overflow y captura de elemento disparador
  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  // Manejo de foco inicial al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Manejo de Escape y Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  const handleAcceptAndContinue = () => {
    onAccept();
  };

  if (!isOpen) return null;

  const content = LEGAL_DOCUMENTS[role] || LEGAL_DOCUMENTS.postulante;
  const sections = activeTab === 'terminos' ? content.terminos : content.privacidad;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      aria-describedby="modalDesc"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        ref={modalRef}
        className="bg-surface rounded-2xl border border-border shadow-modal max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-200"
      >
        {/* Cabecera */}
        <div className="p-5 sm:p-6 border-b border-border flex items-start justify-between bg-brand-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="modalTitle" className="text-lg font-bold text-foreground">
                Términos del Servicio y Privacidad
              </h3>
              <p id="modalDesc" className="text-xs text-muted-foreground">
                Oficina de Empleo &bull; Municipalidad de Funes
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Cerrar ventana de términos"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-brand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-800 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Aviso institucional de texto provisorio */}
        <div className="px-5 sm:px-6 pt-4">
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-800 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-bold block">Texto provisorio de referencia municipal</span>
              <span>
                Las cláusulas a continuación son provisionales y están sujetas a ratificación por el Departamento Ejecutivo Municipal de Funes.
              </span>
            </div>
          </div>
        </div>

        {/* Pestañas accesibles */}
        <div
          role="tablist"
          aria-label="Documentación legal"
          className="px-5 sm:px-6 pt-3 flex gap-2 border-b border-border"
        >
          <button
            role="tab"
            type="button"
            id="tab-terminos"
            aria-selected={activeTab === 'terminos'}
            aria-controls="panel-terminos"
            onClick={() => setActiveTab('terminos')}
            className={`pb-2 text-xs font-bold px-1 transition-colors focus:outline-none cursor-pointer ${
              activeTab === 'terminos'
                ? 'text-brand-800 border-b-2 border-brand-800'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent font-semibold'
            }`}
          >
            Términos y Condiciones
          </button>
          <button
            role="tab"
            type="button"
            id="tab-privacidad"
            aria-selected={activeTab === 'privacidad'}
            aria-controls="panel-privacidad"
            onClick={() => setActiveTab('privacidad')}
            className={`pb-2 text-xs font-bold px-1 transition-colors focus:outline-none cursor-pointer ${
              activeTab === 'privacidad'
                ? 'text-brand-800 border-b-2 border-brand-800'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent font-semibold'
            }`}
          >
            Política de Privacidad
          </button>
        </div>

        {/* Contenido scrolleable de paneles */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-foreground/85 leading-relaxed flex-1">
          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="space-y-3"
          >
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  {sec.title}
                </h4>
                <p>
                  {sec.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pie del modal */}
        <div className="p-4 sm:p-5 bg-brand-50/40 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Presioná Escape o el botón para volver
          </span>
          <button
            type="button"
            onClick={handleAcceptAndContinue}
            className="px-5 py-2.5 bg-brand-800 text-white font-semibold text-xs rounded-xl hover:bg-brand-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-800 cursor-pointer"
          >
            Aceptar y continuar
          </button>
        </div>
      </div>
    </div>
  );
};
