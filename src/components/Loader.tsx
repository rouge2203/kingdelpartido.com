import logo from "../assets/monkey_bored.png";

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center h-screen ">
      <img src={logo} alt="King del Partido logo" className="size-40" />
      <p className="text-gray-400 text-xl font-medium mt-4">Cargando...</p>
    </div>
  );
}

export default Loader;
