import { redirect } from "next/navigation";

// Crear un aprobador desde aquí producía registros sin cuenta de acceso
// (no podían iniciar sesión). El alta correcta vive en Configuración, que
// crea el usuario Y su cuenta en un solo paso.
export default function NuevoAprobadorPage() {
  redirect("/configuracion/new");
}
