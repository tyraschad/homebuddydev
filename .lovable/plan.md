Add 10 px bottom padding to the white logo `<img>` in the elder screen header (`src/routes/elder.tsx`, line ~252). This applies to both V1 and V2 since the logo is in shared markup above the variant branch.

- Change the `style` object on the `<img>` to include `paddingBottom: 10` (e.g. `style={{ display: "block", height: 28, width: "auto", paddingBottom: 10 }}`).