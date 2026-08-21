"use client";

import { createContext, useContext } from "react";

// Permite que un componente anidado (el diálogo de aprobadores) fuerce el
// guardado del borrador de la revisión ANTES de una acción que recarga la
// página. No se puede pasar como prop: el diálogo se construye en un server
// component (invoice-detail.tsx) y las funciones no cruzan esa frontera.
type ReviewDraftSaver = { save: () => Promise<void> };

const ReviewDraftContext = createContext<ReviewDraftSaver | null>(null);

export function ReviewDraftProvider({
  value,
  children,
}: {
  value: ReviewDraftSaver;
  children: React.ReactNode;
}) {
  return (
    <ReviewDraftContext.Provider value={value}>
      {children}
    </ReviewDraftContext.Provider>
  );
}

// Devuelve null fuera del panel de revisión (el diálogo también se usa en la
// sección "Aprobaciones", donde no hay borrador que guardar).
export function useReviewDraftSaver() {
  return useContext(ReviewDraftContext);
}
