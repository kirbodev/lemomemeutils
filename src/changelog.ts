export default {
  name: "Minor Update",
  date: new Date(2024, 2, 28),
  version: "1.7.1",
  description: "Small bug fixes",
  changelog: [
    "Devs can now bypass permission checks, if they have OTP enabled.",
    "Users can now warn themselves.",
    "The staff applications button is now sticky.",
    "Next update will be a major update!",
  ],
} satisfies {
  name: string;
  date: Date;
  version: string;
  description: string;
  changelog: string[];
};
