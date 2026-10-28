'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, ExternalLink, Calendar, Briefcase, Info } from 'lucide-react';
import Link from 'next/link';
import { Notificacion } from '@/types/database';
import { getNotificacionesUsuario, marcarNotificacionLeida } from '@/lib/notifications';

export function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
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
    return () => {
      isMounted = false;
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
    await marcarNotificacionLeida(id);
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrevista':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'invitacion':
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
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
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">Avisos y Notificaciones</h4>
            <span className="text-xs text-slate-500">
              {noLeidas} pendiente{noLeidas !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notificaciones.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 text-center">Cargando avisos...</p>
            ) : notificaciones.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 text-center">No tenés notificaciones pendientes.</p>
            ) : (
              notificaciones.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 transition-colors flex items-start gap-3 ${
                    !n.leida ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                    {getIcon(n.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-semibold ${!n.leida ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                        {n.titulo}
                      </p>
                      {!n.leida && (
                        <button
                          type="button"
                          onClick={(e) => handleMarcarLeida(n.id, e)}
                          title="Marcar como leída"
                          aria-label="Marcar como leída"
                          className="text-slate-400 hover:text-emerald-700 p-0.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.mensaje}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
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
                          onClick={() => {
                            void handleMarcarLeida(n.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-800)] hover:underline"
                        >
                          Ver detalle
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
