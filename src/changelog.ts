export default {
    name: "Bug Fixes + Feature Update",
    date: new Date(2024, 0, 21),
    version: "1.4.0",
    description: "Fixed some bugs and added the staff application system. Also added back persistent warnings.",
    changelog: [
        "Fixed persistent warnings applying when they shouldn't be.",
        "Added staff application system.",
        "Fixed \"Application did not respond\" error when latency is high.",
        "Warns now have stages. A heavy warn will turn into a light warn after 3 days.",
    ],
} satisfies {
    name: string;
    date: Date;
    version: string;
    description: string;
    changelog: string[];
}