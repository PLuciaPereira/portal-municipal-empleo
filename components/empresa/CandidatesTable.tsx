'use client';

import React, { useState } from 'react';
import { VistaCandidatoEmpresa } from '@/types/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  GraduationCapIcon,
  ClockIcon,
  PhoneIcon,
  MailIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';
import { CandidateActionModal } from './CandidateActionModal';
import { createClient } from '@/lib/supabase/client';

interface CandidatesTableProps {
  candidatos: VistaCandidatoEmpresa[];
  loading?: boolean;
  onRefresh: () => void;
}

export function CandidatesTable({
  candidatos,
  loading,
  onRefresh,
}: CandidatesTableProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<VistaCandidatoEmpresa | null>(null);
  const [actionType, setActionType] = useState<'contratar' | 'rechazar'>('contratar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);

  const handleOpenAction = (candidato: VistaCandidatoEmpresa, type: 'contratar' | 'rechazar') => {
    setSelectedCandidate(candidato);
    setActionType(type);
    setIsModalOpen(true);
  };

  const handleDownloadCv = async (candidato: VistaCandidatoEmpresa) => {
    if (!candidato.cv_url) return;

    setDownloadingCvId(candidato.postulacion_id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('postulantes-cvs')
        .createSignedUrl(candidato.cv_url, 60);

      if (error || !data?.signedUrl) {
        alert('No se pudo generar el enlace seguro de descarga del CV.');
        return;
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado';
      alert('Error al acceder al currículum vitae: ' + msg);
    } finally {
      setDownloadingCvId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-zinc-500">
        <ClockIcon className="w-8 h-8 mx-auto animate-spin text-brand-600 mb-2" />
        <p className="text-sm">Cargando candidatos derivados...</p>
      </div>
    );
  }

  if (candidatos.length === 0) {
    return (
      <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
        <UserIcon className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-zinc-800">
          No hay candidatos derivados actualmente
        </h4>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
          La Oficina de Empleo te presentará postulantes seleccionados que se ajusten a tus búsquedas laborales publicadas.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {candidatos.map((cand) => {
          const isActivo = cand.estado_postulacion === 'presentado_a_empresa';
          const isContratado = cand.estado_postulacion === 'contratado';
          const isRechazado = cand.estado_postulacion === 'rechazado_por_empresa';
          const nombreCompleto = `${cand.nombre} ${cand.apellido || ''}`.trim();

          return (
            <div
              key={cand.postulacion_id}
              className={`p-5 bg-white border rounded-2xl shadow-sm transition-all space-y-4 ${
                isActivo
                  ? 'border-brand-200 bg-white hover:border-brand-300'
                  : 'border-zinc-200 bg-zinc-50/50 opacity-90'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold text-zinc-900">
                      {nombreCompleto}
                    </h4>
                    {isActivo && <Badge variant="brand">Presentado por Municipio</Badge>}
                    {isContratado && <Badge variant="emerald">Contratado</Badge>}
                    {isRechazado && <Badge variant="rose">Rechazado por Empresa</Badge>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Postulado a: <strong>{cand.oferta_titulo}</strong> • Derivado:{' '}
                    {cand.fecha_derivacion
                      ? new Date(cand.fecha_derivacion).toLocaleDateString('es-AR')
                      : 'Fecha no registrada'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {cand.cv_url && isActivo ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadCv(cand)}
                      isLoading={downloadingCvId === cand.postulacion_id}
                    >
                      <FileTextIcon className="w-4 h-4 mr-1 text-zinc-600" />
                      Ver CV
                    </Button>
                  ) : (
                    <span className="text-[11px] text-zinc-400 italic px-2 py-1 bg-zinc-100 rounded-lg">
                      CV no disponible (proceso cerrado)
                    </span>
                  )}

                  {isActivo && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenAction(cand, 'contratar')}
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        Contratar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleOpenAction(cand, 'rechazar')}
                      >
                        <XCircleIcon className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Datos de Contacto Directo: Visibles solo durante la derivación formal activa (Req. 13 y 26) */}
              {isActivo ? (
                <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-900">
                    <ShieldCheckIcon className="w-4 h-4 text-sky-700" />
                    <span>Datos de contacto habilitados por derivación municipal oficial:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-zinc-800">
                    {cand.dni && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 font-medium">DNI:</span>
                        <span className="font-semibold">{cand.dni}</span>
                      </div>
                    )}
                    {cand.telefono && (
                      <div className="flex items-center gap-1.5">
                        <PhoneIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <a
                          href={`tel:${cand.telefono}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {cand.telefono}
                        </a>
                      </div>
                    )}
                    {cand.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MailIcon className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <a
                          href={`mailto:${cand.email}`}
                          className="font-medium text-sky-700 hover:underline truncate"
                        >
                          {cand.email}
                        </a>
                      </div>
                    )}
                    {cand.direccion && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPinIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-zinc-600 truncate">{cand.direccion}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-zinc-500 bg-zinc-100/70 p-2 rounded-lg italic">
                  Por normativa de privacidad municipal, el acceso a datos de contacto y CV finaliza al registrarse la contratación o rechazo del candidato.
                </div>
              )}

              {/* Atributos y resumen del perfil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-zinc-100 text-xs text-zinc-600">
                <div className="flex items-center gap-1.5">
                  <MapPinIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Residencia: {cand.localidad || 'Funes'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <GraduationCapIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Nivel Educativo: {cand.nivel_educativo || 'No especificado'}</span>
                </div>
                {cand.resumen_laboral && (
                  <div className="sm:col-span-2 md:col-span-3 text-zinc-700 bg-zinc-50 p-2.5 rounded-xl border border-zinc-150">
                    <span className="font-semibold block text-zinc-800 mb-0.5">
                      Resumen de experiencia:
                    </span>
                    <p className="line-clamp-2">{cand.resumen_laboral}</p>
                  </div>
                )}
              </div>

              {/* Habilidades destacadas */}
              {cand.habilidades && cand.habilidades.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-zinc-500">Habilidades:</span>
                  {cand.habilidades.map((hab, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[11px] bg-zinc-100 text-zinc-700 rounded-md font-medium"
                    >
                      {hab}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedCandidate && (
        <CandidateActionModal
          candidato={selectedCandidate}
          actionType={actionType}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
          onSuccess={() => {
            onRefresh();
          }}
        />
      )}
    </>
  );
}
