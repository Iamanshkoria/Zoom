
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {

    const [username, setusername] = useState("");
    const [password, setpassword] = useState("");

    const navigate = useNavigate();

    const handleLogin = async (e) => {

        e.preventDefault();

        const response = await fetch("http://localhost:8000/api/Login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        const data = await response.json();

        console.log(data);

        if (response.ok) {

            localStorage.setItem("Token", data.token);

            navigate("/home");
        }
    };

    return (

        <div className="container mt-5">

            <div className="row justify-content-center">

                <div className="col-md-6 col-lg-5">

                    <div className="card shadow">

                        <div className="card-body p-4">

                            <h2 className="text-center mb-4">
                                Login
                            </h2>

                            <form onSubmit={handleLogin}>

                                <div className="mb-3">

                                    <label className="form-label">
                                        Username
                                    </label>

                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter Username"
                                        value={username}
                                        onChange={(e) =>
                                            setusername(e.target.value)
                                        }
                                    />

                                </div>

                                <div className="mb-3">

                                    <label className="form-label">
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="Enter Password"
                                        value={password}
                                        onChange={(e) =>
                                            setpassword(e.target.value)
                                        }
                                    />

                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-success w-100"
                                >
                                    Login
                                </button>

                            </form>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Login;
