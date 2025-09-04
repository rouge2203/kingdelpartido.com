"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { UserIcon } from "@heroicons/react/24/outline";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

const UsernameModal = ({ open, onClose }: Props) => {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!username.trim()) {
      setError("Ingresa un nombre de usuario");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          username: username.trim(),
          points: profile?.points ?? 0,
        },
        { onConflict: "id" }
      );
      if (error) {
        // Handle unique violation (duplicate username)
        if (
          (error as any).code === "23505" ||
          /duplicate|already exists/i.test(error.message)
        ) {
          setError("Ese nombre de usuario ya está en uso. Elige otro.");
        } else {
          setError("Ocurrió un error al guardar. Intenta nuevamente.");
        }
        return;
      }
      await refreshProfile();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/90  backdrop-blur-sm transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[enter]:ease-out data-[leave]:duration-200 data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-50 w-screen overflow-y-auto ">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-primary px-4 pt-5 pb-4 text-left shadow-xl shadow-white/50 outline -outline-offset-1 outline-white/10 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[enter]:ease-out data-[leave]:duration-200 data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95 border border-gray-700"
          >
            <div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-yellow-500/10">
                <UserIcon
                  aria-hidden="true"
                  className="size-6 text-yellow-400"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-white"
                >
                  Crea tu nombre de usuario
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-gray-300">
                    Elige un nombre para identificarte en la tabla de puntos de
                    la Quiniela.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario"
                className="w-full rounded-md border border-gray-700 bg-black/20 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-600"
              />
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
            </div>

            <div className="mt-5 sm:mt-6 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:border-gray-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex w-full justify-center rounded-md bg-yellow-500/90 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default UsernameModal;
