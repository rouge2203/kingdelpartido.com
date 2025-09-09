"use client";

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import logo from "../assets/monkey_logo.png";

const Navbar = () => {
  const { user, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const username = profile?.username ?? null;
  const points = profile?.points ?? 0;

  return (
    <header className="relative isolate z-10 bg-primary border-b border-gray-700">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-5xl items-center justify-between p-4 lg:px-6"
      >
        <div className="flex lg:flex-1 items-center">
          <NavLink
            to="/dashboard"
            className="-m-1.5 p-1.5 flex items-center gap-2"
          >
            <span className="sr-only">King del Partido</span>
            <img alt="King del Partido" src={logo} className="h-8 w-auto" />
            <span className="text-2xl sm:text-4xl w-full flex sm:justify-center  items-center gap-2 font-bold text-yellow-400 ">
              King del Partido
            </span>
          </NavLink>
        </div>

        {/* Desktop Right Side */}
        {/* <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-4">
          {username ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-yellow-400 font-semibold">
                {points ?? 0} pts
              </span>
              <span className="text-gray-200">{username}</span>
            </div>
          ) : null}
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-white px-3 py-1.5 rounded-md border border-gray-600 hover:border-yellow-600 hover:text-yellow-400"
            >
              Cerrar sesión
            </button>
          ) : null}
        </div> */}

        {/* Mobile menu button */}
        <div className="flex ">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-300"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="">
        <DialogBackdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition data-[closed]:opacity-0" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-primary p-6 sm:max-w-sm sm:ring-1 sm:ring-white/10 border-l border-gray-700 transition data-[closed]:translate-x-full">
          <div className="flex items-center justify-between">
            <NavLink
              to="/dashboard"
              className="-m-1.5 p-1.5 flex items-center gap-2"
            >
              <img alt="King del Partido" src={logo} className="h-8 w-auto" />
              <span className="text-white font-semibold tracking-tight">
                King del Partido
              </span>
            </NavLink>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-300"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-white/10">
              <div className="space-y-2 py-6">
                {username ? (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 text-base font-semibold text-white bg-white/5">
                    <span>@{username}</span>
                    <span className="text-yellow-400">{points ?? 0} pts</span>
                  </div>
                ) : null}
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/5"
                >
                  Partidos
                </NavLink>
                <NavLink
                  to="/leaderboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold text-white hover:bg-white/5"
                >
                  Tabla de Posiciones
                </NavLink>
              </div>
              <div className="py-6">
                {user ? (
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await handleSignOut();
                    }}
                    className="-mx-3 block w-full rounded-lg px-3 py-2.5 text-left text-base font-semibold text-white hover:bg-white/5 border border-gray-600"
                  >
                    Cerrar sesión
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  );
};

export default Navbar;
