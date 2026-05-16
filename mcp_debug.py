#!/usr/bin/env python3
"""Transparent proxy that logs all MCP traffic."""
import sys, os, subprocess, threading

LOG = open("/tmp/mcp_raw.log", "w", buffering=1)

def copy(src, dst, tag):
    for line in src:
        LOG.write(f"[{tag}] {line.rstrip()}\n")
        LOG.flush()
        dst.write(line)
        dst.flush()

venv = os.path.dirname(os.path.abspath(__file__)) + "/venv/bin/bookmark-context"
proc = subprocess.Popen([venv, "mcp"], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                        text=True, bufsize=1)

t1 = threading.Thread(target=copy, args=(sys.stdin, proc.stdin, "IN"), daemon=True)
t2 = threading.Thread(target=copy, args=(proc.stdout, sys.stdout, "OUT"), daemon=True)
t1.start(); t2.start()
proc.wait()
