import React, { useState, useEffect } from "react";
import axios from "axios";

const Battlegrounds = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const sheetId = "1KmKfRjdvPOsZf4iCyjm4Yvu5e9BEejoAUZtXMjV6lnQ";
    const apiKey =
      "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCifkFySbq8wQvG1DtF7JDlG6Dc5OHzcRfSPa3gt6CAVPCVBZaqNG8E3c7gPDKvedKy10tJWE09un2PQVIMXh56aDvnaEbxZlkZ1tvAVGTs2e7MuplQOejQ+QDj9jH/0WIQdgRc+H81wCCg\niHxEr+GKy5T5svUuDdwNuWUfv8shUznyjAcvvwrAJmLgkzkGe0r+HQsI8dQYnAY2\nHM0wh1P/kSRM+3pumliYP9pC4Mj2/agtHA/IyVmUuF+/hxN14iqyxw7fNKTMBnv9\nAZyZa7wiPwASmidFSIdpUdRbmIu6zAweZauXNjFvViqCzqQzZG+/hriUXalF6cc1\nXT6QjiFDAgMBAAECggEACkyqZU4bEf/CeVXWc/YssPjxV08Cq2WNtvvF26qH99pq\nbWevRxaPuuU8SaZHKCw2mLNgyENakgESGFRxmOsWT3fv5BkN9hsgpqyhvS0cQI8H\nvd5N/XHOOgCud8SRIr/o0VZJrILrvUJyTvqXtdrYFu4UgUdAlyy1uAD6UercOz5r\nQeL8Q70kU7hqq+JC/iro8fyOb/1fMPSPP0dBGXV2e809Hhf/pV9cU1IsBVhhzelz\nqrKqyPm2KIxj9aaItbF6KxbH2WYwdMtCirOJLC1VN/QZnfspYbWqYpK/X2fq/a5O\nUjP6d87gG1XT1DxodNATWukw412R9o2dB/80XuH6MQKBgQDgqLaw+La68Vqp9Grp\nU54lPaXWp20GvglExt7nw+mUvc2kt+56Vz7RpIO1ypps2qpclgZtH3xE3ZS1APFR\nMWY9c+4pyLGkMLtj5Hve2XWOeLvPlG72w1kCSa4qau57gN+oQHS9I8NiFA1LwwEy\nLV5su/81j2S273xzux0txHse9QKBgQC5KWcDtoOvhgeZmOctxvXaY1DYpVISWzR0\nCmN3MM2SzqkwP1Hqb+pl4LkaBd6huz8bgvkyB1BWw43hlxzycjM3CkhCYXK93X+k\nPR/RPeWTg7cbKi8sQ2GGV2dlRxwMrTW5/ZlhF0tfrMKS8ZUy14YQJCh+q9TASeGU\ntArMBAKsVwKBgDubB720f2biGlf1TVhSoybmUFW/XiHn0bW5vfJn/FVGdoU5d8Bl\n3Xjp2TgmZQp0iba+5z2UmPf8gjPz6BLOtH2hgJL9eIRDmbRLLsJVl+cRCWNt0nMO\nKVN+EQOYE2YZLz4Iu/BiyLgA8fYj6vFRMDhROMkRHnua1r4t6vP1qWTxAoGBAKac\nXaiWo5neNZp9Xo/vdqwjL80xvU7tKJ699lB65pASS2UxpOkZ+UXg105WN8U58wgz\naz4cHKtl3ZY/Xnm+Tt1Y8Dpi61dzJvbHVYj3dEuveqUD6Vyf6PJ0VYJpYRD7Dtwk\nGM6nolgd4RtOLJ2KF4UQtCt/PLomAMjI1OpNNYaTAoGBAMt8dHayAQokSZx7zZUx\nN+GdpuPlV+G0XKgA0l2wgoc8T5/vHQMY+8CQYQ09NOVc9fYuA5dMjAOI1ei7/GB9\nO1PrkKjrdSzIHM5qu5ZM49kpra0JaB7UsHDbMeaMt6K8Ol69bBof9VTyHgBhsg2oqNsOq+LqVV6S5FoEI/0Uhk2G-5Yv9g0";
    const range = "Sheet1";

    axios
      .get(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`
      )
      .then((response) => {
        setData(response.data.values);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  return (
    <div>
      <h1>Battlegrounds Data</h1>
      <ul>
        {data.map((row, index) => (
          <li key={index}>{row.join(", ")}</li>
        ))}
      </ul>
    </div>
  );
};

export default Battlegrounds;
