import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaChessKnight } from "react-icons/fa";
import "../styles/Battlegrounds.css";

// Public-facing Google Sheet. The API key is read from an environment variable
// (REACT_APP_GOOGLE_SHEETS_API_KEY) rather than hardcoded. Create a browser API
// key in Google Cloud, restrict it to the Sheets API + your site's referrer,
// and put it in .env.local. Never commit a service-account *private* key here —
// anything in this bundle is public.
const SHEET_ID = "1KmKfRjdvPOsZf4iCyjm4Yvu5e9BEejoAUZtXMjV6lnQ";
const RANGE = "Sheet1";

const Battlegrounds = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_SHEETS_API_KEY;

    if (!apiKey) {
      setError(
        "No Sheets API key configured. Add REACT_APP_GOOGLE_SHEETS_API_KEY to .env.local to load live data."
      );
      setLoading(false);
      return;
    }

    axios
      .get(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${apiKey}`
      )
      .then((response) => {
        setRows(response.data.values || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching Battlegrounds data:", err);
        setError("Couldn't load the Battlegrounds data right now.");
        setLoading(false);
      });
  }, []);

  const headers = rows.length ? rows[0] : [];
  const dataRows = rows.length ? rows.slice(1) : [];

  return (
    <div className="bg-page">
      <section className="bg-hero">
        <div className="container">
          <span className="eyebrow bg-eyebrow">
            <FaChessKnight /> Hearthstone
          </span>
          <h1 className="bg-hero__title">Battlegrounds tracker</h1>
          <p className="bg-hero__sub">
            Every ranked Battlegrounds game I log ends up in a spreadsheet — and
            shows up here as a running record of the climb.
          </p>
        </div>
      </section>

      <div className="container bg-body">
        {!loading && !error && dataRows.length > 0 && (
          <div className="bg-stats">
            <div className="bg-stat">
              <span className="bg-stat__num">{dataRows.length}</span>
              <span className="bg-stat__label">Games logged</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-state">
            <div className="bg-spinner" />
            <p>Loading match history…</p>
          </div>
        )}

        {error && (
          <div className="bg-state bg-state--error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && dataRows.length === 0 && (
          <div className="bg-state">
            <p>No games logged yet.</p>
          </div>
        )}

        {!loading && !error && dataRows.length > 0 && (
          <div className="bg-table-wrap">
            <table className="bg-table">
              <thead>
                <tr>
                  {headers.map((cell, i) => (
                    <th key={i}>{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, r) => (
                  <tr key={r}>
                    {headers.map((_, c) => (
                      <td key={c}>{row[c] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Battlegrounds;
