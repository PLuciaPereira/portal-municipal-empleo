'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Calendar,
  Briefcase,
  Building2,
  Info,
  Clock,
  AlertTriangle,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Notificacion } from '@/types/database';
import {
  getNotificacionesUsuario,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  verificarVencimientosUsuario,
} from '@/lib/notifications';

export function NotificationBell() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    // Ejecutar verificación no bloqueante de vencimientos si corresponde
    void verificarVencimientosUsuario();
    const data = await getNotificacionesUsuario();
    setNotificaciones(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAvisos = async () => {
      if (!isMounted) return;
      await loadNotifications();
    };
    void fetchAvisos();

    // Polling suave cada 60s para refrescar avisos en tiempo real
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadNotifications();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loadNotifications]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const handleMarcarLeida = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Optimista
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
    await marcarNotificacionLeida(id);
  };

  const handleMarcarTodasLeidas = async () => {
    if (noLeidas === 0 || markingAll) return;
    setMarkingAll(true);
    // Optimista
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    await marcarTodasNotificacionesLeidas();
    setMarkingAll(false);
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrevista':
        return <Calendar className="w-4 h-4 text-indigo-700" />;
      case 'invitacion':
      case 'postulacion':
        return <Briefcase className="w-4 h-4 text-brand-800" />;
      case 'empresa':
        return <Building2 className="w-4 h-4 text-sky-700" />;
      case 'curso':
        return <GraduationCap className="w-4 h-4 text-emerald-700" />;
      case 'vencimiento':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'alerta':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-emerald-700" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) void loadNotifications();
        }}
        aria-label={`Notificaciones (${noLeidas} no leídas)`}
        title="Centro de Notificaciones y Avisos"
        className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white ring-2 ring-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-zinc-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Cabecera del desplegable */}
          <div className="px-4 py-2.5 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Avisos y Novedades
              </h4>
              {noLeidas > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                  {noLeidas} nueva{noLeidas !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-400 font-medium">Al día</span>
              )}
            </div>

            {noLeidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                disabled={markingAll}
                className="text-[11px] font-bold text-brand-800 hover:text-brand-950 hover:underline flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Marcar leídas</span>
              </button>
            )}
          </div>

          {/* Lista scrolleable de notificaciones */}
          <div className="max-h-88 overflow-y-auto divide-y divide-zinc-100">
            {loading && notificaciones.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                <Clock className="w-5 h-5 text-zinc-400 animate-spin mx-auto" />
                <p>Cargando notificaciones...</p>
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                <Bell className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
                <p className="font-semibold text-zinc-700">Sin notificaciones pendientes</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Te avisaremos ante cualquier novedad laboral.</p>
              </div>
            ) : (
              notificaciones.map((n) => {
                const motivo = (n.metadata as any)?.motivo;
                return (
                  <div
                    key={n.id}
                    className={`p-3.5 transition-colors flex items-start gap-3 ${
                      !n.leida ? 'bg-brand-50/40 hover:bg-brand-50/70' : 'hover:bg-zinc-50/80'
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs shrink-0">
                      {getIcon(n.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={`text-xs leading-tight ${
                            !n.leida ? 'text-zinc-900 font-extrabold' : 'text-zinc-700 font-semibold'
                          }`}
                        >
                          {n.titulo}
                        </p>
                        {!n.leida && (
                          <button
                            type="button"
                            onClick={(e) => handleMarcarLeida(n.id, e)}
                            title="Marcar como leída"
                            aria-label="Marcar como leída"
                            className="text-zinc-400 hover:text-emerald-700 p-0.5 rounded cursor-pointer transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{n.mensaje}</p>

                      {/* Motivo explícito destacado si viene en metadata */}
                      {motivo && (
                        <div className="mt-2 p-2 rounded-lg bg-zinc-100/90 border border-zinc-200/80 text-[11px] text-zinc-700 leading-snug">
                          <span className="font-bold text-zinc-900">Motivo informado: </span>
                          <span className="italic">{motivo}</span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400">
                          {new Date(n.created_at).toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={(e) => {
                              void handleMarcarLeida(n.id);
                              setIsOpen(false);
                              if (n.link) {
                                router.push(n.link);
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-800 hover:text-brand-950 hover:underline cursor-pointer"
                          >
                            <span>Ver detalle</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
