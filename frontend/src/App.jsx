
import "bootstrap/dist/css/bootstrap.min.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import CreateMeeting from "./components/CreateMeeting.jsx";

function App() {

    return (

        <BrowserRouter>

            <Routes>

                <Route path="/register" element={<Register />} />

                <Route path="/login" element={<Login />} />

                <Route path="/home" element={<Home />} />
            </Routes>

        </BrowserRouter>
    );
}

export default App;
