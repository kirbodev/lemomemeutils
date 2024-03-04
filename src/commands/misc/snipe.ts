import type {
  APIApplicationCommandOption,
  ChatInputCommandInteraction,
} from 'discord.js';
import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';

export default {
  name: 'snipe',
  description: 'Retrieves recently deleted messages.',
  options: [{
    name: 'channel',
    description: 'The channel to snipe messages from',
    type: ApplicationCommandOptionType.Channel,
    required: false, // Optional input for channel
  }, {
    name: 'amount',
    description: 'The amount of messages to retrieve',
    type: ApplicationCommandOptionType.Integer,
    required: false, // Optional input for the amount of messages
  }],
  slash: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });

    // Extracting options
    const channelOption = interaction.options.getChannel('channel') || interaction.channel;
    const amount = interaction.options.getInteger('amount') || 1; // Default to 1 message if not specified

    // Validate the channel type
    if (!channelOption || !('messages' in channelOption)) {
      await interaction.editReply('The specified channel is not a text-based channel.');
      return;
    }

    // Retrieve sniped messages (This part assumes you have a mechanism to track and retrieve deleted messages)
    const snipedMessages = getSnipedMessages(channelOption.id, amount); // Implement this function according to your message tracking system

    if (!snipedMessages.length) {
      await interaction.editReply('No recently deleted messages found.');
      return;
    }

    // Creating and sending an embed with sniped messages
    const embed = new EmbedBuilder()
      .setTitle(`Sniped Messages in #${channelOption.name}`)
      .setColor('#0099ff');

    snipedMessages.forEach((msg, index) => {
      // Ensure the embed does not exceed Discord's limits
      if (index < 25) {
        embed.addFields({ name: `Message ${index + 1}`, value: msg.content.substring(0, 1024) });
      }
    });

    await interaction.editReply({ embeds: [embed] });
  },
} as Command;

// Placeholder for the getSnipedMessages function
// Implement according to your data storage/retrieval mechanism
function getSnipedMessages(channelId: string, amount: number): { content: string }[] {
  // This function should return an array of message objects from your storage mechanism
  return []; // Return an array of sniped messages
}
