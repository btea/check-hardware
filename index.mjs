import { exec } from 'node:child_process';
import os from 'node:os';
import { smbiosMemoryTypeMap } from './const.mjs';

const isWindows = os.platform() === 'win32'
const isLinux = os.platform() === 'linux'

const greenText = str => `\x1b[32m${str}\x1b[0m`;

async function getMemoryDetails() {
	const slots = await getMemorySlots();
  if (isWindows) {
    // Query additional property SMBIOSMemoryType for modern memory types.
    const command = 'wmic memorychip get Manufacturer,PartNumber,Capacity,Speed,MemoryType,SMBIOSMemoryType';
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error: ${stderr}`);
        return;
      }
      const table = []
      const lines = stdout.split('\n');
      lines.forEach(line => {
        // Expecting columns separated by two or more spaces.
				const row = []
        const columns = line.trim().split(/\s{2,}/);
        if (columns.length === 6 && columns[0] !== 'Manufacturer') {
          const [Manufacturer, PartNumber, Capacity, Speed, MemoryType] = columns;
          // Use the SMBIOSMemoryType value to determine DDR4 status
					const memoryTypeDesc = Number(MemoryType) in smbiosMemoryTypeMap ? smbiosMemoryTypeMap[Number(MemoryType)] : MemoryType;
          row.push(Manufacturer, PartNumber, Capacity, Speed, memoryTypeDesc)
					table.push(row)
        }
      });
			table.forEach((row, index) => {
				if (index > 0) {
					row[0] = Number(row[0]) / 1024 / 1024 / 1024 + ' GB'
				}
			})
			const lengs = new Array(table[0].length).fill(0)
			table.forEach(row => {
				row.forEach((col, index) => {
					lengs[index] = Math.max(lengs[index], col.length)
				})
			})
			table.forEach(row => {
				row.forEach((col, index) => {
					const len = lengs[index]
					row[index] = col.padEnd(len)
				})
			})
			let str = ''
			table.forEach(row => {
				row.forEach((col) => {
					str += col + ' '
				})
				str += '\n'
			})
			console.log(greenText(str))
			console.log(`Total Slots: ${greenText(slots)}, Used Slots: ${greenText(table.length - 1)}`)
    });
  } else if (isLinux) {
    // Using dmidecode on Linux to get detailed memory information.
    const command = 'sudo dmidecode -t memory | grep -E "Manufacturer|Part Number|Size|Speed|Type"';
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error: ${stderr}`);
        return;
      }
      const lines = stdout.split('\n');
			lines.forEach(line => {
				// Expecting lines formatted as "Property: Value"
				const match = line.match(/(.*?):\s*(.*)/);
				if (match) {
					const [_, property, value] = match;
					console.log(`${property.trim()}: ${value.trim()}`);
				}
			});
    });
  } else {
    console.log('Unsupported OS');
  }
}

async function getMemorySlots() {
  if (isWindows) {
		return new Promise((resolve, reject) => {
			// Use WMIC to get the number of memory slots.
			exec('wmic path Win32_PhysicalMemoryArray get MemoryDevices', (err, stdout, stderr) => {
				if (err) {
					console.error(`Error: ${stderr}`);
					reject(err);
					return;
				}
				// Filter out the header and empty lines.
				const lines = stdout.split('\n').filter(line => line.trim() !== '' && !line.includes("MemoryDevices"));
				lines.forEach(line => {
					const slots = parseInt(line.trim(), 10);
					if (!isNaN(slots)) {
						resolve(slots);
					}
				});
			});
		})
  } else if (isLinux) {
		return new Promise((resolve, reject) => {
			// Use dmidecode to get the number of memory slots.
			exec('sudo dmidecode -t memory | grep "Number Of Devices"', (err, stdout, stderr) => {
				if (err) {
					console.error(`Error: ${stderr}`);
					reject(err);
					return;
				}
				// Look for a line formatted as "Number Of Devices: <value>"
				const match = stdout.match(/Number Of Devices:\s*(\d+)/);
				if (match && match[1]) {
					resolve(parseInt(match[1], 10));
				} else {
					reject(new Error("Couldn't parse the number of memory slots from dmidecode output."));
				}
			});
		})
  } else {
		Promise.reject(new Error('Unsupported OS'));
  }
}


getMemoryDetails();
