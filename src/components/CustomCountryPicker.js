import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet } from 'react-native';

const countries = [
  { cca2: 'AF', name: 'Afghanistan', callingCode: ['93'], flag: '🇦🇫', phoneLength: [9] },
  { cca2: 'AX', name: 'Åland Islands', callingCode: ['358'], flag: '🇦🇽', phoneLength: [9] },
  { cca2: 'AL', name: 'Albania', callingCode: ['355'], flag: '🇦🇱', phoneLength: [9] },
  { cca2: 'DZ', name: 'Algeria', callingCode: ['213'], flag: '🇩🇿', phoneLength: [9] },
  { cca2: 'AS', name: 'American Samoa', callingCode: ['1684'], flag: '🇦🇸', phoneLength: [7] },
  { cca2: 'AD', name: 'Andorra', callingCode: ['376'], flag: '🇦🇩', phoneLength: [6] },
  { cca2: 'AO', name: 'Angola', callingCode: ['244'], flag: '🇦🇴', phoneLength: [9] },
  { cca2: 'AI', name: 'Anguilla', callingCode: ['1264'], flag: '🇦🇮', phoneLength: [7] },
  { cca2: 'AQ', name: 'Antarctica', callingCode: ['672'], flag: '🇦🇶', phoneLength: [5] },
  { cca2: 'AG', name: 'Antigua and Barbuda', callingCode: ['1268'], flag: '🇦🇬', phoneLength: [7] },
  { cca2: 'AR', name: 'Argentina', callingCode: ['54'], flag: '🇦🇷', phoneLength: [10, 11] },
  { cca2: 'AM', name: 'Armenia', callingCode: ['374'], flag: '🇦🇲', phoneLength: [8] },
  { cca2: 'AW', name: 'Aruba', callingCode: ['297'], flag: '🇦🇼', phoneLength: [7] },
  { cca2: 'AU', name: 'Australia', callingCode: ['61'], flag: '🇦🇺', phoneLength: [9] },
  { cca2: 'AT', name: 'Austria', callingCode: ['43'], flag: '🇦🇹', phoneLength: [10, 11, 12] },
  { cca2: 'AZ', name: 'Azerbaijan', callingCode: ['994'], flag: '🇦🇿', phoneLength: [9] },
  { cca2: 'BS', name: 'Bahamas', callingCode: ['1242'], flag: '🇧🇸', phoneLength: [7] },
  { cca2: 'BH', name: 'Bahrain', callingCode: ['973'], flag: '🇧🇭', phoneLength: [8] },
  { cca2: 'BD', name: 'Bangladesh', callingCode: ['880'], flag: '🇧🇩', phoneLength: [10, 11] },
  { cca2: 'BB', name: 'Barbados', callingCode: ['1246'], flag: '🇧🇧', phoneLength: [7] },
  { cca2: 'BY', name: 'Belarus', callingCode: ['375'], flag: '🇧🇾', phoneLength: [9] },
  { cca2: 'BE', name: 'Belgium', callingCode: ['32'], flag: '🇧🇪', phoneLength: [9] },
  { cca2: 'BZ', name: 'Belize', callingCode: ['501'], flag: '🇧🇿', phoneLength: [7] },
  { cca2: 'BJ', name: 'Benin', callingCode: ['229'], flag: '🇧🇯', phoneLength: [8] },
  { cca2: 'BM', name: 'Bermuda', callingCode: ['1441'], flag: '🇧🇲', phoneLength: [7] },
  { cca2: 'BT', name: 'Bhutan', callingCode: ['975'], flag: '🇧🇹', phoneLength: [8] },
  { cca2: 'BO', name: 'Bolivia', callingCode: ['591'], flag: '🇧🇴', phoneLength: [8] },
  { cca2: 'BA', name: 'Bosnia and Herzegovina', callingCode: ['387'], flag: '🇧🇦', phoneLength: [8] },
  { cca2: 'BW', name: 'Botswana', callingCode: ['267'], flag: '🇧🇼', phoneLength: [8] },
  { cca2: 'BV', name: 'Bouvet Island', callingCode: ['47'], flag: '🇧🇻', phoneLength: [8] },
  { cca2: 'BR', name: 'Brazil', callingCode: ['55'], flag: '🇧🇷', phoneLength: [10, 11] },
  { cca2: 'IO', name: 'British Indian Ocean Territory', callingCode: ['246'], flag: '🇮🇴', phoneLength: [7] },
  { cca2: 'BN', name: 'Brunei Darussalam', callingCode: ['673'], flag: '🇧🇳', phoneLength: [7] },
  { cca2: 'BG', name: 'Bulgaria', callingCode: ['359'], flag: '🇧🇬', phoneLength: [9] },
  { cca2: 'BF', name: 'Burkina Faso', callingCode: ['226'], flag: '🇧🇫', phoneLength: [8] },
  { cca2: 'BI', name: 'Burundi', callingCode: ['257'], flag: '🇧🇮', phoneLength: [8] },
  { cca2: 'KH', name: 'Cambodia', callingCode: ['855'], flag: '🇰🇭', phoneLength: [8, 9] },
  { cca2: 'CM', name: 'Cameroon', callingCode: ['237'], flag: '🇨🇲', phoneLength: [8] },
  { cca2: 'CA', name: 'Canada', callingCode: ['1'], flag: '🇨🇦', phoneLength: [10] },
  { cca2: 'CV', name: 'Cape Verde', callingCode: ['238'], flag: '🇨🇻', phoneLength: [7] },
  { cca2: 'KY', name: 'Cayman Islands', callingCode: ['1345'], flag: '🇰🇾', phoneLength: [7] },
  { cca2: 'CF', name: 'Central African Republic', callingCode: ['236'], flag: '🇨🇫', phoneLength: [8] },
  { cca2: 'TD', name: 'Chad', callingCode: ['235'], flag: '🇹🇩', phoneLength: [8] },
  { cca2: 'CL', name: 'Chile', callingCode: ['56'], flag: '🇨🇱', phoneLength: [9] },
  { cca2: 'CN', name: 'China', callingCode: ['86'], flag: '🇨🇳', phoneLength: [11] },
  { cca2: 'CX', name: 'Christmas Island', callingCode: ['61'], flag: '🇨🇽', phoneLength: [9] },
  { cca2: 'CC', name: 'Cocos (Keeling) Islands', callingCode: ['61'], flag: '🇨🇨', phoneLength: [9] },
  { cca2: 'CO', name: 'Colombia', callingCode: ['57'], flag: '🇨🇴', phoneLength: [10] },
  { cca2: 'KM', name: 'Comoros', callingCode: ['269'], flag: '🇰🇲', phoneLength: [7] },
  { cca2: 'CG', name: 'Congo', callingCode: ['242'], flag: '🇨🇬', phoneLength: [9] },
  { cca2: 'CD', name: 'Congo, Democratic Republic of the', callingCode: ['243'], flag: '🇨🇩', phoneLength: [9] },
  { cca2: 'CK', name: 'Cook Islands', callingCode: ['682'], flag: '🇨🇰', phoneLength: [5] },
  { cca2: 'CR', name: 'Costa Rica', callingCode: ['506'], flag: '🇨🇷', phoneLength: [8] },
  { cca2: 'CI', name: 'Côte d\'Ivoire', callingCode: ['225'], flag: '🇨🇮', phoneLength: [8] },
  { cca2: 'HR', name: 'Croatia', callingCode: ['385'], flag: '🇭🇷', phoneLength: [9] },
  { cca2: 'CU', name: 'Cuba', callingCode: ['53'], flag: '🇨🇺', phoneLength: [8] },
  { cca2: 'CY', name: 'Cyprus', callingCode: ['357'], flag: '🇨🇾', phoneLength: [8] },
  { cca2: 'CZ', name: 'Czech Republic', callingCode: ['420'], flag: '🇨🇿', phoneLength: [9] },
  { cca2: 'DK', name: 'Denmark', callingCode: ['45'], flag: '🇩🇰', phoneLength: [8] },
  { cca2: 'DJ', name: 'Djibouti', callingCode: ['253'], flag: '🇩🇯', phoneLength: [8] },
  { cca2: 'DM', name: 'Dominica', callingCode: ['1767'], flag: '🇩🇲', phoneLength: [7] },
  { cca2: 'DO', name: 'Dominican Republic', callingCode: ['1809'], flag: '🇩🇴', phoneLength: [7] },
  { cca2: 'EC', name: 'Ecuador', callingCode: ['593'], flag: '🇪🇨', phoneLength: [9] },
  { cca2: 'EG', name: 'Egypt', callingCode: ['20'], flag: '🇪🇬', phoneLength: [10] },
  { cca2: 'SV', name: 'El Salvador', callingCode: ['503'], flag: '🇸🇻', phoneLength: [8] },
  { cca2: 'GQ', name: 'Equatorial Guinea', callingCode: ['240'], flag: '🇬🇶', phoneLength: [9] },
  { cca2: 'ER', name: 'Eritrea', callingCode: ['291'], flag: '🇪🇷', phoneLength: [7] },
  { cca2: 'EE', name: 'Estonia', callingCode: ['372'], flag: '🇪🇪', phoneLength: [8] },
  { cca2: 'ET', name: 'Ethiopia', callingCode: ['251'], flag: '🇪🇹', phoneLength: [9] },
  { cca2: 'FK', name: 'Falkland Islands (Malvinas)', callingCode: ['500'], flag: '🇫🇰', phoneLength: [5] },
  { cca2: 'FO', name: 'Faroe Islands', callingCode: ['298'], flag: '🇫🇴', phoneLength: [6] },
  { cca2: 'FJ', name: 'Fiji', callingCode: ['679'], flag: '🇫🇯', phoneLength: [7] },
  { cca2: 'FI', name: 'Finland', callingCode: ['358'], flag: '🇫🇮', phoneLength: [9] },
  { cca2: 'FR', name: 'France', callingCode: ['33'], flag: '🇫🇷', phoneLength: [9] },
  { cca2: 'GF', name: 'French Guiana', callingCode: ['594'], flag: '🇬🇫', phoneLength: [9] },
  { cca2: 'PF', name: 'French Polynesia', callingCode: ['689'], flag: '🇵🇫', phoneLength: [8] },
  { cca2: 'TF', name: 'French Southern Territories', callingCode: ['262'], flag: '🇹🇫', phoneLength: [9] },
  { cca2: 'GA', name: 'Gabon', callingCode: ['241'], flag: '🇬🇦', phoneLength: [8] },
  { cca2: 'GM', name: 'Gambia', callingCode: ['220'], flag: '🇬🇲', phoneLength: [7] },
  { cca2: 'GE', name: 'Georgia', callingCode: ['995'], flag: '🇬🇪', phoneLength: [9] },
  { cca2: 'DE', name: 'Germany', callingCode: ['49'], flag: '🇩🇪', phoneLength: [10, 11, 12] },
  { cca2: 'GH', name: 'Ghana', callingCode: ['233'], flag: '🇬🇭', phoneLength: [9] },
  { cca2: 'GI', name: 'Gibraltar', callingCode: ['350'], flag: '🇬🇮', phoneLength: [8] },
  { cca2: 'GR', name: 'Greece', callingCode: ['30'], flag: '🇬🇷', phoneLength: [10] },
  { cca2: 'GL', name: 'Greenland', callingCode: ['299'], flag: '🇬🇱', phoneLength: [6] },
  { cca2: 'GD', name: 'Grenada', callingCode: ['1473'], flag: '🇬🇩', phoneLength: [7] },
  { cca2: 'GP', name: 'Guadeloupe', callingCode: ['590'], flag: '🇬🇵', phoneLength: [9] },
  { cca2: 'GU', name: 'Guam', callingCode: ['1671'], flag: '🇬🇺', phoneLength: [7] },
  { cca2: 'GT', name: 'Guatemala', callingCode: ['502'], flag: '🇬🇹', phoneLength: [8] },
  { cca2: 'GG', name: 'Guernsey', callingCode: ['44'], flag: '🇬🇬', phoneLength: [10] },
  { cca2: 'GN', name: 'Guinea', callingCode: ['224'], flag: '🇬🇳', phoneLength: [9] },
  { cca2: 'GW', name: 'Guinea-Bissau', callingCode: ['245'], flag: '🇬🇼', phoneLength: [7] },
  { cca2: 'GY', name: 'Guyana', callingCode: ['592'], flag: '🇬🇾', phoneLength: [7] },
  { cca2: 'HT', name: 'Haiti', callingCode: ['509'], flag: '🇭🇹', phoneLength: [8] },
  { cca2: 'HM', name: 'Heard Island and McDonald Islands', callingCode: ['672'], flag: '🇭🇲', phoneLength: [5] },
  { cca2: 'VA', name: 'Holy See (Vatican City State)', callingCode: ['379'], flag: '🇻🇦', phoneLength: [10] },
  { cca2: 'HN', name: 'Honduras', callingCode: ['504'], flag: '🇭🇳', phoneLength: [8] },
  { cca2: 'HK', name: 'Hong Kong', callingCode: ['852'], flag: '🇭🇰', phoneLength: [8] },
  { cca2: 'HU', name: 'Hungary', callingCode: ['36'], flag: '🇭🇺', phoneLength: [9] },
  { cca2: 'IS', name: 'Iceland', callingCode: ['354'], flag: '🇮🇸', phoneLength: [7] },
  { cca2: 'IN', name: 'India', callingCode: ['91'], flag: '🇮🇳', phoneLength: [10] },
  { cca2: 'ID', name: 'Indonesia', callingCode: ['62'], flag: '🇮🇩', phoneLength: [9, 10, 11] },
  { cca2: 'IR', name: 'Iran, Islamic Republic of', callingCode: ['98'], flag: '🇮🇷', phoneLength: [10] },
  { cca2: 'IQ', name: 'Iraq', callingCode: ['964'], flag: '🇮🇶', phoneLength: [10] },
  { cca2: 'IE', name: 'Ireland', callingCode: ['353'], flag: '🇮🇪', phoneLength: [9] },
  { cca2: 'IM', name: 'Isle of Man', callingCode: ['44'], flag: '🇮🇲', phoneLength: [10] },
  { cca2: 'IL', name: 'Israel', callingCode: ['972'], flag: '🇮🇱', phoneLength: [9] },
  { cca2: 'IT', name: 'Italy', callingCode: ['39'], flag: '🇮🇹', phoneLength: [10] },
  { cca2: 'JM', name: 'Jamaica', callingCode: ['1876'], flag: '🇯🇲', phoneLength: [7] },
  { cca2: 'JP', name: 'Japan', callingCode: ['81'], flag: '🇯🇵', phoneLength: [10, 11] },
  { cca2: 'JE', name: 'Jersey', callingCode: ['44'], flag: '🇯🇪', phoneLength: [10] },
  { cca2: 'JO', name: 'Jordan', callingCode: ['962'], flag: '🇯🇴', phoneLength: [9] },
  { cca2: 'KZ', name: 'Kazakhstan', callingCode: ['7'], flag: '🇰🇿', phoneLength: [10] },
  { cca2: 'KE', name: 'Kenya', callingCode: ['254'], flag: '🇰🇪', phoneLength: [9] },
  { cca2: 'KI', name: 'Kiribati', callingCode: ['686'], flag: '🇰🇮', phoneLength: [8] },
  { cca2: 'KP', name: 'Korea, Democratic People\'s Republic of', callingCode: ['850'], flag: '🇰🇵', phoneLength: [10] },
  { cca2: 'KR', name: 'Korea, Republic of', callingCode: ['82'], flag: '🇰🇷', phoneLength: [10, 11] },
  { cca2: 'KW', name: 'Kuwait', callingCode: ['965'], flag: '🇰🇼', phoneLength: [8] },
  { cca2: 'KG', name: 'Kyrgyzstan', callingCode: ['996'], flag: '🇰🇬', phoneLength: [9] },
  { cca2: 'LA', name: 'Lao People\'s Democratic Republic', callingCode: ['856'], flag: '🇱🇦', phoneLength: [10] },
  { cca2: 'LV', name: 'Latvia', callingCode: ['371'], flag: '🇱🇻', phoneLength: [8] },
  { cca2: 'LB', name: 'Lebanon', callingCode: ['961'], flag: '🇱🇧', phoneLength: [8] },
  { cca2: 'LS', name: 'Lesotho', callingCode: ['266'], flag: '🇱🇸', phoneLength: [8] },
  { cca2: 'LR', name: 'Liberia', callingCode: ['231'], flag: '🇱🇷', phoneLength: [8] },
  { cca2: 'LY', name: 'Libyan Arab Jamahiriya', callingCode: ['218'], flag: '🇱🇾', phoneLength: [9] },
  { cca2: 'LI', name: 'Liechtenstein', callingCode: ['423'], flag: '🇱🇮', phoneLength: [7] },
  { cca2: 'LT', name: 'Lithuania', callingCode: ['370'], flag: '🇱🇹', phoneLength: [8] },
  { cca2: 'LU', name: 'Luxembourg', callingCode: ['352'], flag: '🇱🇺', phoneLength: [9] },
  { cca2: 'MO', name: 'Macao', callingCode: ['853'], flag: '🇲🇴', phoneLength: [8] },
  { cca2: 'MK', name: 'Macedonia, The Former Yugoslav Republic of', callingCode: ['389'], flag: '🇲🇰', phoneLength: [8] },
  { cca2: 'MG', name: 'Madagascar', callingCode: ['261'], flag: '🇲🇬', phoneLength: [9] },
  { cca2: 'MW', name: 'Malawi', callingCode: ['265'], flag: '🇲🇼', phoneLength: [9] },
  { cca2: 'MY', name: 'Malaysia', callingCode: ['60'], flag: '🇲🇾', phoneLength: [9, 10] },
  { cca2: 'MV', name: 'Maldives', callingCode: ['960'], flag: '🇲🇻', phoneLength: [7] },
  { cca2: 'ML', name: 'Mali', callingCode: ['223'], flag: '🇲🇱', phoneLength: [8] },
  { cca2: 'MT', name: 'Malta', callingCode: ['356'], flag: '🇲🇹', phoneLength: [8] },
  { cca2: 'MH', name: 'Marshall Islands', callingCode: ['692'], flag: '🇲🇭', phoneLength: [7] },
  { cca2: 'MQ', name: 'Martinique', callingCode: ['596'], flag: '🇲🇶', phoneLength: [9] },
  { cca2: 'MR', name: 'Mauritania', callingCode: ['222'], flag: '🇲🇷', phoneLength: [8] },
  { cca2: 'MU', name: 'Mauritius', callingCode: ['230'], flag: '🇲🇺', phoneLength: [8] },
  { cca2: 'YT', name: 'Mayotte', callingCode: ['262'], flag: '🇾🇹', phoneLength: [9] },
  { cca2: 'MX', name: 'Mexico', callingCode: ['52'], flag: '🇲🇽', phoneLength: [10] },
  { cca2: 'FM', name: 'Micronesia, Federated States of', callingCode: ['691'], flag: '🇫🇲', phoneLength: [7] },
  { cca2: 'MD', name: 'Moldova, Republic of', callingCode: ['373'], flag: '🇲🇩', phoneLength: [8] },
  { cca2: 'MC', name: 'Monaco', callingCode: ['377'], flag: '🇲🇨', phoneLength: [8] },
  { cca2: 'MN', name: 'Mongolia', callingCode: ['976'], flag: '🇲🇳', phoneLength: [8] },
  { cca2: 'ME', name: 'Montenegro', callingCode: ['382'], flag: '🇲🇪', phoneLength: [8] },
  { cca2: 'MS', name: 'Montserrat', callingCode: ['1664'], flag: '🇲🇸', phoneLength: [7] },
  { cca2: 'MA', name: 'Morocco', callingCode: ['212'], flag: '🇲🇦', phoneLength: [9] },
  { cca2: 'MZ', name: 'Mozambique', callingCode: ['258'], flag: '🇲🇿', phoneLength: [9] },
  { cca2: 'MM', name: 'Myanmar', callingCode: ['95'], flag: '🇲🇲', phoneLength: [9, 10] },
  { cca2: 'NA', name: 'Namibia', callingCode: ['264'], flag: '🇳🇦', phoneLength: [9] },
  { cca2: 'NR', name: 'Nauru', callingCode: ['674'], flag: '🇳🇷', phoneLength: [7] },
  { cca2: 'NP', name: 'Nepal', callingCode: ['977'], flag: '🇳🇵', phoneLength: [10] },
  { cca2: 'NL', name: 'Netherlands', callingCode: ['31'], flag: '🇳🇱', phoneLength: [9] },
  { cca2: 'NC', name: 'New Caledonia', callingCode: ['687'], flag: '🇳🇨', phoneLength: [6] },
  { cca2: 'NZ', name: 'New Zealand', callingCode: ['64'], flag: '🇳🇿', phoneLength: [9] },
  { cca2: 'NI', name: 'Nicaragua', callingCode: ['505'], flag: '🇳🇮', phoneLength: [8] },
  { cca2: 'NE', name: 'Niger', callingCode: ['227'], flag: '🇳🇪', phoneLength: [8] },
  { cca2: 'NG', name: 'Nigeria', callingCode: ['234'], flag: '🇳🇬', phoneLength: [10, 11] },
  { cca2: 'NU', name: 'Niue', callingCode: ['683'], flag: '🇳🇺', phoneLength: [4] },
  { cca2: 'NF', name: 'Norfolk Island', callingCode: ['672'], flag: '🇳🇫', phoneLength: [5] },
  { cca2: 'MP', name: 'Northern Mariana Islands', callingCode: ['1670'], flag: '🇲🇵', phoneLength: [7] },
  { cca2: 'NO', name: 'Norway', callingCode: ['47'], flag: '🇳🇴', phoneLength: [8] },
  { cca2: 'OM', name: 'Oman', callingCode: ['968'], flag: '🇴🇲', phoneLength: [8] },
  { cca2: 'PK', name: 'Pakistan', callingCode: ['92'], flag: '🇵🇰', phoneLength: [10] },
  { cca2: 'PW', name: 'Palau', callingCode: ['680'], flag: '🇵🇼', phoneLength: [7] },
  { cca2: 'PS', name: 'Palestinian Territory, Occupied', callingCode: ['970'], flag: '🇵🇸', phoneLength: [9] },
  { cca2: 'PA', name: 'Panama', callingCode: ['507'], flag: '🇵🇦', phoneLength: [8] },
  { cca2: 'PG', name: 'Papua New Guinea', callingCode: ['675'], flag: '🇵🇬', phoneLength: [8] },
  { cca2: 'PY', name: 'Paraguay', callingCode: ['595'], flag: '🇵🇾', phoneLength: [9] },
  { cca2: 'PE', name: 'Peru', callingCode: ['51'], flag: '🇵🇪', phoneLength: [9] },
  { cca2: 'PH', name: 'Philippines', callingCode: ['63'], flag: '🇵🇭', phoneLength: [10] },
  { cca2: 'PN', name: 'Pitcairn', callingCode: ['64'], flag: '🇵🇳', phoneLength: [9] },
  { cca2: 'PL', name: 'Poland', callingCode: ['48'], flag: '🇵🇱', phoneLength: [9] },
  { cca2: 'PT', name: 'Portugal', callingCode: ['351'], flag: '🇵🇹', phoneLength: [9] },
  { cca2: 'PR', name: 'Puerto Rico', callingCode: ['1787'], flag: '🇵🇷', phoneLength: [7] },
  { cca2: 'QA', name: 'Qatar', callingCode: ['974'], flag: '🇶🇦', phoneLength: [8] },
  { cca2: 'RE', name: 'Réunion', callingCode: ['262'], flag: '🇷🇪', phoneLength: [9] },
  { cca2: 'RO', name: 'Romania', callingCode: ['40'], flag: '🇷🇴', phoneLength: [9] },
  { cca2: 'RU', name: 'Russian Federation', callingCode: ['7'], flag: '🇷🇺', phoneLength: [10] },
  { cca2: 'RW', name: 'Rwanda', callingCode: ['250'], flag: '🇷🇼', phoneLength: [9] },
  { cca2: 'BL', name: 'Saint Barthélemy', callingCode: ['590'], flag: '🇧🇱', phoneLength: [9] },
  { cca2: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha', callingCode: ['290'], flag: '🇸🇭', phoneLength: [4] },
  { cca2: 'KN', name: 'Saint Kitts and Nevis', callingCode: ['1869'], flag: '🇰🇳', phoneLength: [7] },
  { cca2: 'LC', name: 'Saint Lucia', callingCode: ['1758'], flag: '🇱🇨', phoneLength: [7] },
  { cca2: 'MF', name: 'Saint Martin (French part)', callingCode: ['590'], flag: '🇲🇫', phoneLength: [9] },
  { cca2: 'PM', name: 'Saint Pierre and Miquelon', callingCode: ['508'], flag: '🇵🇲', phoneLength: [6] },
  { cca2: 'VC', name: 'Saint Vincent and the Grenadines', callingCode: ['1784'], flag: '🇻🇨', phoneLength: [7] },
  { cca2: 'WS', name: 'Samoa', callingCode: ['685'], flag: '🇼🇸', phoneLength: [7] },
  { cca2: 'SM', name: 'San Marino', callingCode: ['378'], flag: '🇸🇲', phoneLength: [10] },
  { cca2: 'ST', name: 'Sao Tome and Principe', callingCode: ['239'], flag: '🇸🇹', phoneLength: [7] },
  { cca2: 'SA', name: 'Saudi Arabia', callingCode: ['966'], flag: '🇸🇦', phoneLength: [9] },
  { cca2: 'SN', name: 'Senegal', callingCode: ['221'], flag: '🇸🇳', phoneLength: [9] },
  { cca2: 'RS', name: 'Serbia', callingCode: ['381'], flag: '🇷🇸', phoneLength: [9] },
  { cca2: 'SC', name: 'Seychelles', callingCode: ['248'], flag: '🇸🇨', phoneLength: [7] },
  { cca2: 'SL', name: 'Sierra Leone', callingCode: ['232'], flag: '🇸🇱', phoneLength: [8] },
  { cca2: 'SG', name: 'Singapore', callingCode: ['65'], flag: '🇸🇬', phoneLength: [8] },
  { cca2: 'SK', name: 'Slovakia', callingCode: ['421'], flag: '🇸🇰', phoneLength: [9] },
  { cca2: 'SI', name: 'Slovenia', callingCode: ['386'], flag: '🇸🇮', phoneLength: [8] },
  { cca2: 'SB', name: 'Solomon Islands', callingCode: ['677'], flag: '🇸🇧', phoneLength: [7] },
  { cca2: 'SO', name: 'Somalia', callingCode: ['252'], flag: '🇸🇴', phoneLength: [8] },
  { cca2: 'ZA', name: 'South Africa', callingCode: ['27'], flag: '🇿🇦', phoneLength: [9] },
  { cca2: 'GS', name: 'South Georgia and the South Sandwich Islands', callingCode: ['500'], flag: '🇬🇸', phoneLength: [5] },
  { cca2: 'ES', name: 'Spain', callingCode: ['34'], flag: '🇪🇸', phoneLength: [9] },
  { cca2: 'LK', name: 'Sri Lanka', callingCode: ['94'], flag: '🇱🇰', phoneLength: [9] },
  { cca2: 'SD', name: 'Sudan', callingCode: ['249'], flag: '🇸🇩', phoneLength: [9] },
  { cca2: 'SR', name: 'Suriname', callingCode: ['597'], flag: '🇸🇷', phoneLength: [7] },
  { cca2: 'SJ', name: 'Svalbard and Jan Mayen', callingCode: ['47'], flag: '🇸🇯', phoneLength: [8] },
  { cca2: 'SZ', name: 'Swaziland', callingCode: ['268'], flag: '🇸🇿', phoneLength: [8] },
  { cca2: 'SE', name: 'Sweden', callingCode: ['46'], flag: '🇸🇪', phoneLength: [9] },
  { cca2: 'CH', name: 'Switzerland', callingCode: ['41'], flag: '🇨🇭', phoneLength: [9] },
  { cca2: 'SY', name: 'Syrian Arab Republic', callingCode: ['963'], flag: '🇸🇾', phoneLength: [9] },
  { cca2: 'TW', name: 'Taiwan, Province of China', callingCode: ['886'], flag: '🇹🇼', phoneLength: [9] },
  { cca2: 'TJ', name: 'Tajikistan', callingCode: ['992'], flag: '🇹🇯', phoneLength: [9] },
  { cca2: 'TZ', name: 'Tanzania, United Republic of', callingCode: ['255'], flag: '🇹🇿', phoneLength: [9] },
  { cca2: 'TH', name: 'Thailand', callingCode: ['66'], flag: '🇹🇭', phoneLength: [9] },
  { cca2: 'TL', name: 'Timor-Leste', callingCode: ['670'], flag: '🇹🇱', phoneLength: [8] },
  { cca2: 'TG', name: 'Togo', callingCode: ['228'], flag: '🇹🇬', phoneLength: [8] },
  { cca2: 'TK', name: 'Tokelau', callingCode: ['690'], flag: '🇹🇰', phoneLength: [4] },
  { cca2: 'TO', name: 'Tonga', callingCode: ['676'], flag: '🇹🇴', phoneLength: [7] },
  { cca2: 'TT', name: 'Trinidad and Tobago', callingCode: ['1868'], flag: '🇹🇹', phoneLength: [7] },
  { cca2: 'TN', name: 'Tunisia', callingCode: ['216'], flag: '🇹🇳', phoneLength: [8] },
  { cca2: 'TR', name: 'Turkey', callingCode: ['90'], flag: '🇹🇷', phoneLength: [10] },
  { cca2: 'TM', name: 'Turkmenistan', callingCode: ['993'], flag: '🇹🇲', phoneLength: [8] },
  { cca2: 'TC', name: 'Turks and Caicos Islands', callingCode: ['1649'], flag: '🇹🇨', phoneLength: [7] },
  { cca2: 'TV', name: 'Tuvalu', callingCode: ['688'], flag: '🇹🇻', phoneLength: [5] },
  { cca2: 'UG', name: 'Uganda', callingCode: ['256'], flag: '🇺🇬', phoneLength: [9] },
  { cca2: 'UA', name: 'Ukraine', callingCode: ['380'], flag: '🇺🇦', phoneLength: [9] },
  { cca2: 'AE', name: 'United Arab Emirates', callingCode: ['971'], flag: '🇦🇪', phoneLength: [9] },
  { cca2: 'GB', name: 'United Kingdom', callingCode: ['44'], flag: '🇬🇧', phoneLength: [10, 11] },
  { cca2: 'US', name: 'United States', callingCode: ['1'], flag: '🇺🇸', phoneLength: [10] },
  { cca2: 'UM', name: 'United States Minor Outlying Islands', callingCode: ['1'], flag: '🇺🇲', phoneLength: [10] },
  { cca2: 'UY', name: 'Uruguay', callingCode: ['598'], flag: '🇺🇾', phoneLength: [8] },
  { cca2: 'UZ', name: 'Uzbekistan', callingCode: ['998'], flag: '🇺🇿', phoneLength: [9] },
  { cca2: 'VU', name: 'Vanuatu', callingCode: ['678'], flag: '🇻🇺', phoneLength: [7] },
  { cca2: 'VE', name: 'Venezuela, Bolivarian Republic of', callingCode: ['58'], flag: '🇻🇪', phoneLength: [10] },
  { cca2: 'VN', name: 'Viet Nam', callingCode: ['84'], flag: '🇻🇳', phoneLength: [9, 10] },
  { cca2: 'VG', name: 'Virgin Islands, British', callingCode: ['1284'], flag: '🇻🇬', phoneLength: [7] },
  { cca2: 'VI', name: 'Virgin Islands, U.S.', callingCode: ['1340'], flag: '🇻🇮', phoneLength: [7] },
  { cca2: 'WF', name: 'Wallis and Futuna', callingCode: ['681'], flag: '🇼🇫', phoneLength: [6] },
  { cca2: 'EH', name: 'Western Sahara', callingCode: ['212'], flag: '🇪🇭', phoneLength: [9] },
  { cca2: 'YE', name: 'Yemen', callingCode: ['967'], flag: '🇾🇪', phoneLength: [9] },
  { cca2: 'ZM', name: 'Zambia', callingCode: ['260'], flag: '🇿🇲', phoneLength: [9] },
  { cca2: 'ZW', name: 'Zimbabwe', callingCode: ['263'], flag: '🇿🇼', phoneLength: [9] },
];

// Helper function to validate phone number length for a specific country
export const validatePhoneNumber = (phoneNumber, countryCode) => {
  const country = countries.find(c => c.cca2 === countryCode);
  if (!country || !country.phoneLength) {
    return { isValid: false, message: 'Invalid country selected' };
  }

  const cleanNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
  const isValidLength = country.phoneLength.includes(cleanNumber.length);
  
  if (!isValidLength) {
    const expectedLengths = country.phoneLength.join(' or ');
    return {
      isValid: false,
      message: `Phone number should be ${expectedLengths} digits for ${country.name}`
    };
  }

  return { isValid: true, message: '' };
};

// Helper function to get phone number placeholder for a country
export const getPhonePlaceholder = (countryCode) => {
  const country = countries.find(c => c.cca2 === countryCode);
  if (!country || !country.phoneLength) {
    return 'Enter phone number';
  }

  const minLength = Math.min(...country.phoneLength);
  const placeholder = '0'.repeat(minLength);
  return placeholder;
};

const CustomCountryPicker = ({ visible, onClose, onSelect, selectedCountry }) => {
  const [searchText, setSearchText] = useState('');
  
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (country) => {
    onSelect(country);
    onClose();
    setSearchText('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select a country</Text>
        </View>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#999"
          />
        </View>
        
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.cca2}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.countryItem}
              onPress={() => handleSelect(item)}
            >
              <View style={styles.countryInfo}>
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>
                  {item.name} ({item.cca2})
                </Text>
              </View>
              <Text style={styles.countryCode}>+{item.callingCode[0]}</Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
        />
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  searchContainer: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchInput: {
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 2,
    borderBottomColor: '#1a237e',
    paddingVertical: 10,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 15,
  },
  countryName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  countryCode: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  closeButton: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#1a237e',
    fontWeight: 'bold',
  },
});

export default CustomCountryPicker; 