const fetch = require('node-fetch');
const fs = require('fs');
const Promise = require('bluebird');
fetch.Promise = Promise;

const readFile = Promise.promisify(fs.readFile);

const agents = {
  http: require('http-proxy-agent'),
  https: require('https-proxy-agent'),
  socks4: require('socks-proxy-agent'),
  socks5: require('socks-proxy-agent'),
};
const agent = (protocol, proxy) => new agents[protocol](proxy);

const concurrency = 10;
const timeout = 8000;

// const ipCheckUrl = 'http://checkip.dyndns.com/';
const ipCheckUrl = 'https://ipinfo.io/ip';

const getCurrentIp = () => fetch(ipCheckUrl)
  .then(response => response.text())
  .then(response => response.trim())
  // .then(response => response.match(/Current IP Address: (.+)<\/body>/)[1]);

const checkProxy = (ip, port, protocol) => {
  const proxy = `${protocol}://${ip}:${port}`;
  console.log(proxy);
  const startedAt = new Date().getTime();

  return fetch(ipCheckUrl, {
    agent: agent(protocol, proxy),
    // redirect: 'follow',
    // follow: 1,
    timeout,
  })
  .then(response => {
    if (response.ok) {
        return response;
    } else {
        throw Error(response.statusText);
    }
  })
  .then(response => response.text())
  .then(response => response.trim())
  // .then(response => response.match(/Current IP Address: (.+)<\/body>/)[1])
  .then(realIp => ({
    ip,
    port,
    protocol,
    realIp,
    responseTime: new Date().getTime() - startedAt,
  }));
};

const writeOutput = data => {
  try {
    fs.writeFileSync('./output/output.json', JSON.stringify(data, null, 4));
  } catch (err) {
    // An error occurred
    console.error(err);
  }
}

(async () => {
  const myIp = await getCurrentIp();
  console.log(`Current IP: ${myIp}`);

  const proxies = await readFile('./src/proxies.json', 'utf8')
    .then(JSON.parse)
    // .then(data => data.slice(1, 10));
  const startedAt = new Date().getTime();

  Promise.map(proxies, proxy => {
    return checkProxy(proxy.ip, proxy.port, proxy.protocol)
      .then(data => ({
        ...data,
        ...proxy,
        hidesIp: data.realIp !== myIp,
      }))
      // .then(data => getIpCountry(ip, port, protocol).then(countryCode => ({
      //   ...data,
      //   country_code: countryCode,
      // })))
      .then(data => {
        console.log(JSON.stringify(data))
        return data;
      })
      .catch(err => {
        console.log(`${err.name}: ${proxy.protocol}://${proxy.ip}:${proxy.port}. ${err.message}`);
      });
  }, { concurrency })
  .then(writeOutput)
  .then(() => console.log(new Date().getTime() - startedAt));
})();
