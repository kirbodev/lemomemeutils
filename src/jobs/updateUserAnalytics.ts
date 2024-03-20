// import Job from "../structures/jobInterface";
// import { userMessageStore } from "../events/messageCreate/logUserAnalytics";
// import userAnalytics from "../db/models/userAnalytics";
// import logger from "../helpers/logger";

// export default {
//   every: "0 * * * *",
//   dontRunOnStart: true,
//   execute: async () => {
//     await new Promise((resolve) => setTimeout(resolve, 1000 * 5));
//     for (const [k, v] of userMessageStore) {
//       const analytics = await userAnalytics.findOne({
//         userID: k.split("-")[0],
//         guildID: k.split("-")[1],
//       });
//       if (!analytics) {
//         await userAnalytics.create({
//           userID: k.split("-")[0],
//           guildID: k.split("-")[1],
//           messages: [
//             {
//               amount: v.length,
//               hour: new Date(new Date().setMinutes(0, 0, 0)),
//             },
//           ],
//           // get all unique channels and map them to the channelID
//           channels: [...new Set(v.map((m) => m.channelID))].map((channel) => ({
//             channelID: channel,
//             messages: [
//               {
//                 hour: new Date(new Date().setMinutes(0, 0, 0)),
//                 amount: v.filter((m) => m.channelID === channel).length,
//               },
//             ],
//           })),
//         });
//       } else {
//         // check if this hour has already been logged
//         const existingHour = analytics.messages.find(
//           (m) =>
//             m.hour.getTime() ===
//             new Date(new Date().setMinutes(0, 0, 0)).getTime()
//         );
//         if (existingHour) {
//           existingHour.amount += v.length;
//           analytics.messages = analytics.messages.filter(
//             (m) =>
//               m.hour.getTime() !==
//               new Date(new Date().setMinutes(0, 0, 0)).getTime()
//           );
//           analytics.messages.push(existingHour);

//           for (const channel of new Set(v.map((m) => m.channelID))) {
//             const channelMessages = v.filter((m) => m.channelID === channel);
//             const existingChannel = analytics.channels.find(
//               (c) => c.channelID === channel
//             );
//             if (!existingChannel) {
//               analytics.channels.push({
//                 channelID: channel,
//                 messages: [
//                   {
//                     hour: new Date(new Date().setMinutes(0, 0, 0)),
//                     amount: channelMessages.length,
//                   },
//                 ],
//               });
//             } else {
//               // find the existing hour for this channel
//               const existingChannelHour = existingChannel.messages.find(
//                 (m) =>
//                   m.hour.getTime() ===
//                   new Date(new Date().setMinutes(0, 0, 0)).getTime()
//               );
//               if (existingChannelHour) {
//                 existingChannelHour.amount += channelMessages.length;
//               } else {
//                 existingChannel.messages.push({
//                   hour: new Date(new Date().setMinutes(0, 0, 0)),
//                   amount: channelMessages.length,
//                 });
//               }

//               existingChannel.messages = existingChannel.messages.filter(
//                 (m) =>
//                   m.hour.getTime() !==
//                   new Date(new Date().setMinutes(0, 0, 0)).getTime()
//               );
//               existingChannel.messages.push(
//                 existingChannelHour || {
//                   hour: new Date(new Date().setMinutes(0, 0, 0)),
//                   amount: channelMessages.length,
//                 }
//               );
//             }
//           }

//           await analytics
//             .save()
//             .catch(() =>
//               logger.warn(
//                 `Failed to save analytics for ${k.split("-")[0]} in ${
//                   k.split("-")[1]
//                 }`
//               )
//             );
//           continue;
//         }
//         analytics.messages.push({
//           amount: v.length,
//           hour: new Date(new Date().setMinutes(0, 0, 0)),
//         });
//         for (const channel of new Set(v.map((m) => m.channelID))) {
//           const channelMessages = v.filter((m) => m.channelID === channel);
//           const existingChannel = analytics.channels.find(
//             (c) => c.channelID === channel
//           );
//           if (!existingChannel) {
//             analytics.channels.push({
//               channelID: channel,
//               messages: [
//                 {
//                   hour: new Date(new Date().setMinutes(0, 0, 0)),
//                   amount: channelMessages.length,
//                 },
//               ],
//             });
//           } else {
//             existingChannel.messages.push({
//               hour: new Date(new Date().setMinutes(0, 0, 0)),
//               amount: channelMessages.length,
//             });
//           }
//         }
//         await analytics
//           .save()
//           .catch(() =>
//             logger.warn(
//               `Failed to save analytics for ${k.split("-")[0]} in ${
//                 k.split("-")[1]
//               }`
//             )
//           );
//       }
//     }
//     const count = userMessageStore.size;
//     userMessageStore.clear();
//     return `Updated user analytics for ${count} users`;
//   },
// } as Job;
