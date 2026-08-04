import hardhat from "hardhat";

async function main() {
  const { ethers } = hardhat;

  const ThreeWayMatch = await ethers.getContractFactory("ThreeWayMatch");
  const contract = await ThreeWayMatch.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`ThreeWayMatch deployed to: ${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
