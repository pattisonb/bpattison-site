import { google } from "googleapis";
import key from "./bpattison-96d55ddc168f.json";

const fetchSheetData = async () => {
  try {
    const jwtClient = new google.auth.JWT(
      key.client_email,
      null,
      key.private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

    await jwtClient.authorize();

    const sheets = google.sheets({ version: "v4", auth: jwtClient });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "your-spreadsheet-id",
      range: "Sheet1",
    });

    const values = response.data.values;
    console.log("Sheet data:", values);
    // Process and store the sheet data as needed
  } catch (error) {
    console.error("Error fetching sheet data:", error);
  }
};

export default fetchSheetData;
