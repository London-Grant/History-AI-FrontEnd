// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;
// import React, { useState } from "react";

// const PredictionTool = () => {
//     const [input, setInput] = useState("");
//     const [result, setResult] = useState("Result will appear here.");
//     const [loading, setLoading] = useState(false);

//     const getPrediction = async (inputData) => {
//         setLoading(true);
//         try {
//             const response = await fetch("http://127.0.0.1:8000/predict/GOV/", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ input: inputData }),
//             });
//             console.log(JSON.stringify({ input: inputData }));

//             if (!response.ok) throw new Error("Failed to fetch prediction");
//             const data = await response.json();
//             setResult(`Result: ${data.result}`);
//         } catch (error) {
//             console.error("Error:", error);
//             setResult("Error: Unable to fetch prediction.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleSubmit = (event) => {
//         event.preventDefault();
//         getPrediction(input);
//     };

//     return (
//         <div>
//             <h1>AI Prediction Tool</h1>
//             <form onSubmit={handleSubmit}>
//                 <label htmlFor="input">Enter your data:</label>
//                 <input
//                     id="input"
//                     type="text"
//                     value={input}
//                     onChange={(e) => setInput(e.target.value)}
//                     required
//                 />
//                 <button type="submit" disabled={loading}>
//                     {loading ? "Loading..." : "Get Prediction"}
//                 </button>
//             </form>
//             <p>{result}</p>
//         </div>
//     );
// };

// export default PredictionTool;

async function sendData() {
    const inputData = document.getElementById("inputData").value;
    const apiUrl = "https://83c8-108-56-193-11.ngrok-free.app/predict/GOV/"; // Backend URL, leads to ngrok

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: inputData }),
        });

        if (!response.ok) throw new Error("Failed to get response from the server");

        const data = await response.json();
        console.log(data.result);
        document.getElementById("Model Response").innerText = data.result;
    } catch (error) {
        console.error(error);
        document.getElementById("Model Response").innerText = "Error: Unable to fetch prediction.";
    }
}
window.sendData = sendData;

