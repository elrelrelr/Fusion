package com.fusion.app.ui

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.fusion.app.databinding.FragmentChatsBinding
import com.fusion.app.ui.adapter.ChatAdapter
import com.fusion.app.ui.model.Chat

class ChatsFragment : Fragment() {

    private var _binding: FragmentChatsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val chats = listOf(
            Chat("Team Fusion", "Nueva versión 1.7 ya está lista 🚀", "09:41"),
            Chat("Mastodon", "Tu publicación tiene 12 favoritos", "08:12"),
            Chat("Diseño", "Actualizamos el tema oscuro", "Ayer"),
            Chat("Canal Noticias", "Fusion ahora soporta federación", "Lun"),
            Chat("Pruebas", "Correcciones de errores aplicadas", "Dom")
        )
        binding.rvChats.layoutManager = LinearLayoutManager(requireContext())
        binding.rvChats.adapter = ChatAdapter(chats)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
