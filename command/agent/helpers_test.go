package agent

import (
	"testing"

	"github.com/hashicorp/nomad/helper/uuid"
	"github.com/stretchr/testify/require"
)

func TestHTTP_rpcHandlerForAlloc(t *testing.T) {
	t.Parallel()
	require := require.New(t)
	agent := NewTestAgent(t, t.Name(), nil)
	defer agent.Shutdown()

	a := mockFSAlloc(agent.client.NodeID(), nil)
	addAllocToClient(agent, a, terminalClientAlloc)

	// Case 1: Client has allocation
	// Outcome: Use local client
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForAlloc(a.ID)
    require.True(lc)
    require.False(rc)
    require.False(s)
  }

	// Case 2: Client doesn't have allocation and there is a server
	// Outcome: Use server
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForAlloc(uuid.Generate())
    require.False(lc)
    require.False(rc)
    require.True(s)
  }

	// Case 3: Client doesn't have allocation and there is no server
	// Outcome: Use client RPC to server
	srv := agent.server
	agent.server = nil
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForAlloc(uuid.Generate())
    require.False(lc)
    require.True(rc)
    require.False(s)
  }
	agent.server = srv

	// Case 4: No client
	// Outcome: Use server
	client := agent.client
	agent.client = nil
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForAlloc(uuid.Generate())
    require.False(lc)
    require.False(rc)
    require.True(s)
  }
	agent.client = client
}

func TestHTTP_rpcHandlerForNode(t *testing.T) {
	t.Parallel()
	require := require.New(t)
	agent := NewTestAgent(t, t.Name(), nil)
	defer agent.Shutdown()

	cID := agent.client.NodeID()

	// Case 1: Node running, no node ID given
	// Outcome: Use local node
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForNode("")
    require.True(lc)
    require.False(rc)
    require.False(s)
  }

	// Case 2: Node running, it's ID given
	// Outcome: Use local node
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForNode(cID)
    require.True(lc)
    require.False(rc)
    require.False(s)
  }

	// Case 3: Local node but wrong ID and there is no server
	// Outcome: Use client RPC to server
	srv := agent.server
	agent.server = nil
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForNode(uuid.Generate())
    require.False(lc)
    require.True(rc)
    require.False(s)
  }
	agent.server = srv

	// Case 4: No client
	// Outcome: Use server
	client := agent.client
	agent.client = nil
  for _, srv := range agent.Servers {
    lc, rc, s := srv.rpcHandlerForNode(uuid.Generate())
    require.False(lc)
    require.False(rc)
    require.True(s)
  }
	agent.client = client
}
