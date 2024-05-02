// Fruit Harvester

import { spawn } from "child_process";
import fs from "fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node/index.cjs";
import "dotenv/config";
import { platform } from "os";

const devMode = process.argv.includes("dev");
const repo = "https://github.com/kirbodev/lemomemeutils";
let currentName;
let currentChild;

export default async function start() {
  if (devMode)
    console.info(
      "Running in dev mode, directory will be cloned from ./dist., make sure you ran npm run build before starting the script."
    );
  const newName = `./pom-${Date.now()}`;
  console.info(`Cloning ${devMode ? "./dist" : repo} to ${newName}`);
  devMode
    ? copyFolder("./dist", newName)
    : await git.clone({
        url: repo,
        dir: newName,
        fs,
        http,
      });
  if (!fs.existsSync(newName)) {
    console.error(
      "Failed to clone repository, proceeding with full restart..."
    );
    return fullRestart();
  }
  console.info("Repository cloned successfully");

  await installDependencies(newName);

  console.info("Building the project...");
  const build = spawn("npm", ["run", "build"], {
    cwd: newName,
    shell: true,
  });
  await new Promise((resolve) => {
    build.on("close", (code) => {
      if (code !== 0) {
        console.error(
          "Failed to build the project, proceeding with full restart..."
        );
        return fullRestart();
      }
      console.info("Project built successfully");
      resolve();
    });
  });

  const child = spawn("npm", ["run", "start"], {
    cwd: newName,
    shell: true,
    env: process.env,
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(
        "Child process exited with non-zero code, proceeding with full restart..."
      );
      return fullRestart();
    }
  });

  process.on("SIGINT", async () => {
    console.info("Received SIGINT, killing the child process");
    await cleanUp();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.info("Received SIGTERM, killing the child process");
    await cleanUp();
    process.exit(0);
  });

  // forward messages from the child process to the parent process
  child.stdout.on("data", async (data) => {
    const msg = data.toString();
    if (msg === "readySignal") {
      if (currentChild) {
        console.info("Child process is ready, killing the previous process");
        await cleanUp();
      }
      currentName = newName;
      currentChild = child;
      await removeExtraFolders();
      console.info("New process is ready");
    } else if (msg === "restartSignal") {
      console.info("Child process requested a restart, proceeding...");
      start();
    } else {
      process.stdout.write(data);
    }
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(data);
  });

  // forward messages from the parent process to the child process
  process.stdin.on("data", (data) => {
    child.stdin.write(data);
  });

  process.stdin.on("end", () => {
    child.stdin.end();
  });

  process.on("exit", () => {
    process.exitCode = 0;
  });
}

//npm install --cpu=x64 --os=linux sharp
async function installDependencies(cwd) {
  return new Promise((resolve) => {
    console.info("Installing dependencies...");
    if (platform() === "linux") {
      console.info("Linux detected, installing sharp with --cpu=x64 --os=linux")
      const sharp = spawn("npm", ["install", "--cpu=x64", "--os=linux", "sharp"], {
        cwd,
        shell: true,
      });
      sharp.on("close", (code) => {
        if (code !== 0) {
          console.error(
            "Failed to install sharp, proceeding with full restart..."
          );
          return fullRestart();
        }
        console.info("Sharp installed successfully");
      });
    }
    const child = spawn("npm", ["install"], {
      cwd,
      shell: true,
    });
    child.on("close", (code) => {
      if (code !== 0) {
        console.error(
          "Failed to install dependencies, proceeding with full restart..."
        );
        return fullRestart();
      }
      console.info("Dependencies installed successfully");
      resolve();
    });
  });
}

async function removeExtraFolders() {
  // find folders that start with "pom-" and arent the currentName
  const folders = fs.readdirSync("./").filter((f) => f.startsWith("pom-"));
  for (const folder of folders) {
    if (`./${folder}` !== currentName) {
      try {
        fs.rmSync(folder, { recursive: true });
        console.info(`Removed ${folder}`);
      } catch (e) {
        console.error(
          `Failed to remove ${folder}. A process is already running, proceeding with full restart...`
        );
        return fullRestart();
      }
    }
  }
}

async function copyFolder(from, to) {
  fs.mkdirSync(to, { recursive: true });
  const files = fs.readdirSync(from);
  for (const file of files) {
    const fromPath = `${from}/${file}`;
    const toPath = `${to}/${file}`;
    if (fs.statSync(fromPath).isDirectory()) {
      copyFolder(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

async function cleanUp() {
  return new Promise((resolve) => {
    if (!currentChild) resolve();
    currentChild.removeAllListeners();
    currentChild.on("close", resolve);
    currentChild.kill();
    currentChild.stdin.write("exit");
  });
}

async function fullRestart() {
  await cleanUp();
  console.info("Proceeding with npm run start, expect some downtime...");
  const start = spawn("npm", ["run", "start"], {
    shell: true,
    detached: true,
  });
  start.unref();
  console.info("Exiting the current process");
  process.exit(0);
}

start();
