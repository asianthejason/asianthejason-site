// lib/ftcEvents.ts
import "server-only";

const FTC_API_BASE = "https://ftc-api.firstinspires.org/v2.0";

export interface FtcTeam {
  teamNumber?: number;
  displayTeamNumber?: string;
  nameFull?: string | null;
  nameShort?: string | null;
  schoolName?: string | null;
  city?: string | null;
  stateProv?: string | null;
  country?: string | null;
  website?: string | null;
  rookieYear?: number;
  robotName?: string | null;
  districtCode?: string | null;
  homeCMP?: string | null;
  homeRegion?: string | null;
  displayLocation?: string | null;
  [key: string]: unknown;
}
