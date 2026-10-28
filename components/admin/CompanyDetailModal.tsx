'use client';

import React from 'react';
import { Empresa } from '@/types/database';
import { CompanyStatusBadge } from './CompanyStatusBadge';
import { Button } from '@/components/ui/Button';
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Globe,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface CompanyDetailModalProps {
  empresa: Empresa | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (empresa: Empresa) => void;
  onReject: (empresa: Empresa) => void;
}

export function CompanyDetailModal({
  empresa,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: CompanyDetailModalProps) {
  if (!isOpen || !empresa) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-empresa-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-empresa-title" className="text-base font-bold text-zinc-900 leading-tight">
                {empresa.nombre_fantasia || empresa.razon_social}
              </h2>
              <span className="text-xs text-zinc-500 font-medium">
                Razón Social: {empresa.razon_social}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* Estado de Habilitación */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                Estado Actual
              </span>
              <div className="mt-1 flex items-center gap-2">
                <CompanyStatusBadge estado={empresa.estado} />
                {empresa.verificada && (
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verificada
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <span>Registrada el:</span>
              <p className="font-semibold text-zinc-800">
                {new Date(empresa.created_at).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Motivo de rechazo previo si existe */}
          {empresa.estado === 'rechazada' && empresa.motivo_rechazo && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                Motivo de Rechazo Registrado por la Oficina de Empleo:
              </div>
              <p className="text-rose-800 pl-5 whitespace-pre-wrap">{empresa.motivo_rechazo}</p>
              {empresa.fecha_revision && (
                <p className="text-[11px] text-rose-600 pl-5 pt-1">
                  Revisado el {new Date(empresa.fecha_revision).toLocaleString('es-AR')}
                </p>
              )}
            </div>
          )}

          {/* Datos Fiscales y Rubro */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                CUIT
              </span>
              <p className="text-sm font-bold text-zinc-900 font-mono">{empresa.cuit}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                Rubro o Actividad
              </span>
              <p className="text-sm font-semibold text-zinc-900">
                {empresa.rubro || 'No especificado'}
              </p>
            </div>
          </div>

          {/* Ubicación y Domicilio */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-brand-800" />
              Ubicación y Domicilio
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 pt-1">
              <div>
                <span className="text-zinc-500">Localidad:</span>{' '}
                <strong className="text-zinc-900">{empresa.localidad}</strong>
              </div>
              <div>
                <span className="text-zinc-500">Dirección:</span>{' '}
                <strong className="text-zinc-900">{empresa.direccion}</strong>
              </div>
            </div>
          </div>

          {/* Contacto Institucional */}
          <div className="p-4 rounded-xl border border-zinc-200 bg-white space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 uppercase tracking-wider">
              <User className="w-4 h-4 text-brand-800" />
              Datos de Contacto
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="space-y-0.5">
                <span className="text-zinc-500 block">Referente:</span>
                <span className="font-semibold text-zinc-900 block">
                  {empresa.persona_contacto || 'No indicado'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-zinc-400" /> Teléfono:
                </span>
                <a
                  href={`tel:${empresa.telefono}`}
                  className="font-semibold text-brand-800 hover:underline block truncate"
                >
                  {empresa.telefono}
                </a>
              </div>
              <div className="space-y-0.5">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-zinc-400" /> Correo:
                </span>
                <a
                  href={`mailto:${empresa.email_contacto}`}
                  className="font-semibold text-brand-800 hover:underline block truncate"
                >
                  {empresa.email_contacto}
                </a>
              </div>
            </div>
          </div>

          {/* Descripción y Sitio Web */}
          {(empresa.descripcion || empresa.sitio_web) && (
            <div className="space-y-3">
              {empresa.descripcion && (
                <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                    Descripción / Perfil
                  </span>
                  <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {empresa.descripcion}
                  </p>
                </div>
              )}
              {empresa.sitio_web && (
                <div className="text-xs flex items-center gap-1.5 text-zinc-600">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sitio Web:</span>
                  <a
                    href={
                      empresa.sitio_web.startsWith('http')
                        ? empresa.sitio_web
                        : `https://${empresa.sitio_web}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-800 hover:underline truncate"
                  >
                    {empresa.sitio_web}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 bg-zinc-50/80 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar Ficha
          </Button>

          <div className="flex items-center gap-2">
            {empresa.estado !== 'rechazada' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReject(empresa)}
                className="gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                Rechazar Empresa
              </Button>
            )}

            {empresa.estado !== 'aprobada' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onApprove(empresa)}
                className="gap-1.5 bg-brand-800 hover:bg-brand-900"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprobar Empresa
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
