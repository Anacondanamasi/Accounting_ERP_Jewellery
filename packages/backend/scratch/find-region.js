import https from 'https';

const ipAddress = '2406:da12:557:f800:1efc:b0b4:dfa7:f0f4';

// A simple helper to parse IPv6 subnet matching
function ipInSubnet(ip, subnet) {
  // We can just look up the prefixes in the AWS JSON by converting both to binary or doing a simple string prefix match for /36 or /48
  // Since we know AWS regions use /36, /40, /32 blocks, we can check if the AWS block prefix is a substring of the target IP.
  return ip.toLowerCase().startsWith(subnet.toLowerCase().split('/')[0].replace('::', ''));
}

https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const ipv6_prefixes = json.ipv6_prefixes;
      console.log(`Searching for region of ${ipAddress}...`);
      
      // Let's find matches
      const matches = [];
      for (const prefix of ipv6_prefixes) {
        const subnet = prefix.ipv6_prefix;
        // Clean up subnet and ip to compare
        const cleanSubnet = subnet.split('/')[0].replace(/::$/, '');
        if (ipAddress.toLowerCase().startsWith(cleanSubnet.toLowerCase())) {
          matches.push(prefix);
        }
      }
      
      console.log('Matches:', JSON.stringify(matches, null, 2));
    } catch (e) {
      console.error(e);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
